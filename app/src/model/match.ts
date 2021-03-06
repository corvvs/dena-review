import _ from 'lodash';
import * as FS from "firebase/firestore";
import * as FSUtil from '../utils/firestore';
import * as Util from '../utils/util';
import { M4Player } from '../model/player';
import { Game } from '../model/game';

const Prolong = 60 * 1000;
const TimeOut = 60 * 1000;
const MaxRetry = 100;

// 「対戦」オブジェクト

/**
 * 募集中の対戦オブジェクト
 */
type MatchOpened = {
  created_at: Date;
  registerer_id: string;
  registerer_name: string;
  /**
   * 対戦相手候補のID
   */
  opponent_id?: string;
  opponent_name?: string;
  /**
   * 募集完了対戦オブジェクトのID; 候補が決まったら募集側が作る
   */
  closed_match_d?: string;
  /**
   * 対戦の有効期限
   * 募集側が生きていれば延長される
   */
  expires_at: Date;
};

/**
 * 募集完了した対戦オブジェクト
 */
type MatchClosed = {
  created_at: Date;
  registerer_id: string;
  registerer_name: string;
  /**
   * 対戦相手候補のID
   */
  opponent_id: string;
  opponent_name: string
  logs: Game.Log[];
  /**
   * 対戦の有効期限
   * どちらかが生きていれば延長される
   */
  expires_at: Date;
};



export namespace M4Match {
  function makeOpenedMatch(player: M4Player.PlayerData): MatchOpened {
    return {
      created_at: new Date(),
      registerer_id: player.id,
      registerer_name: player.name,
      expires_at: new Date(Date.now() + Prolong),
    };
  }

  function makeClosedMatch(
    opened: MatchOpened,
    opponent_id: string,
    opponent_name: string,
  ): MatchClosed {
    return {
      created_at: new Date(),
      registerer_id: opened.registerer_id,
      registerer_name: opened.registerer_name,
      opponent_id,
      opponent_name,
      logs: [],
      expires_at: new Date(Date.now() + Prolong),
    };
  }

  export async function getMatch(player: M4Player.PlayerData) {
    // `match_opened`にドキュメントがないか探す。

    const db = FS.getFirestore();
    const opened = FS.query(
      FS.collection(db, FSUtil.Collection.ColOpened),
      FS.where("expires_at", ">", new Date()),
    );
    for (let i = 0; i < MaxRetry; i += 1) {
      try {
        console.log(`matching try #${i}`);
        const result = await FS.getDocs(opened);
        const docsYouOpened = result.docs.filter(d => d.get("registerer_id") === player.id);
        const docsOpen = result.docs.filter(d => !d.get("opponent_id") && d.get("registerer_id") !== player.id);

        if (docsOpen.length === 0) {
          return await getMatchSupply(player, _.first(docsYouOpened));
        } else {
          return await getMatchDemand(player, docsOpen[0]);
        }
      } catch (e) {
        console.warn(e);
      }
    }
    throw new Error("matching error");
  }


  export async function fetchMatch(id: string) {
    const db = FS.getFirestore();
    const doc = await FS.getDoc(FS.doc(db, FSUtil.Collection.ColClosed, id));
    
    const playerYou: M4Player.PlayerData = {
      id: doc.get("registerer_id")!,
      name: doc.get("registerer_name")!,
    };
    const playerOpponent: M4Player.PlayerData = {
      id: doc.get("opponent_id")!,
      name: doc.get("opponent_name")!,
    };
    return Game.initPVPGame(
      doc.id,
      playerYou,
      playerOpponent,
      true,
      true,
    );
  }

  async function getMatchSupply(
    player: M4Player.PlayerData,
    openDoc: FS.QueryDocumentSnapshot<FS.DocumentData> | undefined,
  ) {
    const db = FS.getFirestore();
    // [ドキュメントがない場合]
    console.log("no opened doc");
    // `match_opened`にドキュメントを作成し、listenする。
    let opponent_id: string | null = null;
    const { match: matchOpened, ref: matchOpenedRef } = await (async () => {
      if (openDoc) {
        const r = Util.u_datify_fields(openDoc.data()!);
        const match: MatchOpened = {
          created_at: r.created_at,
          registerer_id: r.registerer_id,
          registerer_name: player.name,
          expires_at: new Date(Date.now() + Prolong),
        };
        await FS.updateDoc(openDoc.ref, match);
        return {
          match,
          ref: openDoc.ref,
        };
      } else {
        const match = makeOpenedMatch(player);
        const ref = await FS.addDoc(FS.collection(db, FSUtil.Collection.ColOpened), match);
        return { match, ref };
      }
    })();
    console.log(`made opened doc: ${matchOpenedRef.id}`);

    const matchClosed = await FSUtil.askFirstUpdate(
      matchOpenedRef,
      (snapshot) => {
        if (!snapshot.exists) { return "reject"; }
        opponent_id = snapshot.get("opponent_id");
        if (!opponent_id) { return "ignore"; }
        return "accept";
      },
      (snapshot) => {
          const { opponent_id, opponent_name } = snapshot.data()!;
          const matchClosed = makeClosedMatch(matchOpened, opponent_id!, opponent_name!);
          return matchClosed;
      },
      { timeout: TimeOut },
    )
    // 1. `match_closed`ドキュメントを作成
    const matchClosedRef = await FS.addDoc(FS.collection(db, FSUtil.Collection.ColClosed), matchClosed);
    console.log(`made closed doc: ${matchClosedRef.id}`);

    // 3. `match_opened`ドキュメントの`closed_match_id`に`match_closed`ドキュメントのIDを書き込む
    await FS.updateDoc(matchOpenedRef, { closed_match_id: matchClosedRef.id });
    // 4. `match_closed`ドキュメントの`opponent_id`に`match_opened`ドキュメントの`opponend_id`が入ったら、`match_opened`ドキュメントを削除
    const { opponent_id: closed_opponent_id, opponent_name } = await FSUtil.askFirstUpdate(
      matchClosedRef,
      (snapshot) => {
        if (!snapshot.exists) { return "reject"; }
        const closed_opponent_id = snapshot.get("opponent_id");
        if (!closed_opponent_id) { return "ignore"; }
        return "accept";
      },
      (snapshot) => snapshot.data()!,
      { timeout: TimeOut },
    );
    console.log(`receipt id: ${closed_opponent_id}`);
    console.log(`matched up`);
    await FS.deleteDoc(matchOpenedRef);
    
    // 5. ゲーム開始
    return Game.initPVPGame(
      matchClosedRef.id,
      player,
      {
        id: opponent_id!,
        name: opponent_name!
      },
      true,
      false,
    );
  }

  async function getMatchDemand(player: M4Player.PlayerData, openedDoc: FS.QueryDocumentSnapshot<FS.DocumentData>) {
    // [ドキュメントがある場合]
    const db = FS.getFirestore();
    console.log(`found opened doc: ${openedDoc.id}`);

    // 1. `match_opened`ドキュメントに対して自分のIDを書き込む。
    await FS.updateDoc(openedDoc.ref, { opponent_id: player.id, opponent_name: player.name });
    // 2. `match_opened`ドキュメントをlisten
    const closed_match_id = await FSUtil.askFirstUpdate(
      openedDoc.ref,
      (snapshot) => {
        if (!snapshot.exists) { return "reject"; }
        const closed_match_id = snapshot.get("closed_match_id");
        if (!closed_match_id) { return "ignore"; }
        return "accept";
      },
      (snapshot) => snapshot.get("closed_match_id")!,
      { timeout: TimeOut },
      );
    // 3. `match_opened`ドキュメントの`closed_match_id`に値が入ったら、対応する`match_closed`ドキュメントを見に行く。
    console.log(`receipt match id: ${closed_match_id}`);

    // 5. `match_closed`ドキュメントの`opponent_id`が自分と同じだったら、ゲーム開始
    const closedMatch = await FS.getDoc(FS.doc(db, FSUtil.Collection.ColClosed, closed_match_id));
    const { registerer_id, registerer_name, opponent_id } = closedMatch.data() || {};
    if (!registerer_id || !opponent_id || opponent_id !== player.id) {
      console.log("failed to match up");
      return null;
    }
    return Game.initPVPGame(
      closedMatch.id,
      player,
      {
        id: registerer_id!,
        name: registerer_name || "",
      },
      false,
      false,
    );
  }

  export async function listGames(
    receiver: (games: Game.Game[]) => void,
  ) {
    const db = FS.getFirestore();
    const q = FS.query(
      FS.collection(db, FSUtil.Collection.ColClosed),
      FS.orderBy("expires_at", "desc"),
    );
    FS.onSnapshot(q, {
      next: (snapshot) => {
        const games: Game.Game[] = snapshot.docs.map(d => {
          const r: any = Util.u_datify_fields(d.data()!);
          const playerYou: M4Player.PlayerData = {
            id: r.registerer_id,
            name: r.registerer_name || "Someone",
          };
          const playerOpponent: M4Player.PlayerData = {
            id: r.opponend_id,
            name: r.opponent_name || "Someone",
          };
          return {
            match_id: d.id,
            player_id_you: playerYou.id,
            player_id_opponent: playerOpponent.id,
            playerYou,
            playerOpponent,
            board: [],
            player: "You",
            neutral: true,
            expires_at: r.expires_at,
            logs: r.logs,
          } as any;
        });
        receiver(games);
      },
    });
  }
};