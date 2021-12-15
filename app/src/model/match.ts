import _ from 'lodash';
import * as FS from "firebase/firestore";
import { v4 } from 'uuid';
import { M4Player } from '../model/player'
import { Game } from '../model/game'
import { collection, doc, getDoc, getDocs, updateDoc, where } from 'firebase/firestore';


// 「対戦」オブジェクト

/**
 * 募集中の対戦オブジェクト
 */
type MatchOpened = {
  created_at: Date;
  registerer_id: string;
  /**
   * 対戦相手候補のID
   */
  opponent_id?: string;
  /**
   * 募集完了対戦オブジェクトのID; 候補が決まったら募集側が作る
   */
  closed_match_d?: string;
};

/**
 * 募集完了した対戦オブジェクト
 */
type MatchClosed = {
  created_at: Date;
  registerer_id: string;
  /**
   * 対戦相手候補のID
   */
  opponent_id: string;
  agreed?: boolean;
};

export namespace M4Match {
  const ColClosed = "match_closed";
  const ColOpened = "match_opened";

  function makeOpenedMatch(player: M4Player.PlayerData): MatchOpened {
    return {
      created_at: new Date(),
      registerer_id: player.id,
    };
  }

  function makeClosedMatch(opened: MatchOpened, opponent_id: string): MatchClosed {
    return {
      created_at: new Date(),
      registerer_id: opened.registerer_id,
      opponent_id,
    };
  }

  export async function getMatch(player: M4Player.PlayerData) {
    // `match_opened`にドキュメントがないか探す。

    const db = FS.getFirestore();
    const q = FS.query(FS.collection(db, ColOpened));
    const result = await FS.getDocs(q);
    console.log(result.docs);
    const opened_docs = result.docs.filter(d => !d.get("opponent_id"));

    if (opened_docs.length === 0) {
      // [ドキュメントがない場合]
      console.log("no opened doc");
      // `match_opened`にドキュメントを作成し、listenする。
      let opponent_id: string | null = null;
      const matchOpened = makeOpenedMatch(player);
      const matchOpenedRef = await FS.addDoc(FS.collection(db, ColOpened), matchOpened);
      console.log(`made opened doc: ${matchOpenedRef.id}`);
      const matchClosedRef = await (new Promise<FS.DocumentReference<FS.DocumentData>>((res, rej) => {
        let rejected = false;
        const unsubscriber = FS.onSnapshot(matchOpenedRef, {
          next: async (snapshot) => {
            if (rejected) { return; }
            if (!snapshot.exists) { rejected = true; unsubscriber(); rej("deleted"); return; }
            // `match_opened`ドキュメントの`opponent_id`に値が入った場合、
            opponent_id = snapshot.get("opponent_id");
            if (!opponent_id) { return; }
            console.log(`opponent_id is: ${opponent_id}`);
            
            // 1. `match_closed`ドキュメントを作成
            const matchClosed = makeClosedMatch(matchOpened, opponent_id);
            const matchClosedRef = await FS.addDoc(FS.collection(db, ColClosed), matchClosed);
            console.log(`made closed doc: ${matchClosedRef.id}`);
            // 2. `match_opened`ドキュメントのlistenを解除
            unsubscriber();
            res(matchClosedRef);
          },
        });
        console.log(`listening opened doc: ${matchOpenedRef.id}`);
      }));
      // 3. `match_opened`ドキュメントの`closed_match_id`に`match_closed`ドキュメントのIDを書き込む
      await (new Promise(async (res, rej) => {
        let rejected = false;
        const unsubscriber = FS.onSnapshot(matchClosedRef, {
          next: async (snapshot) => {
            if (rejected) { return; }
            if (!snapshot.exists) { rejected = true; unsubscriber(); rej("deleted"); return; }
            // 4. `match_closed`ドキュメントの`opponent_id`に`match_opened`ドキュメントの`opponend_id`が入ったら、`match_opened`ドキュメントを削除
            const closed_opponent_id = snapshot.get("opponent_id");
            if (!closed_opponent_id) { return; }
            console.log(`receipt id: ${closed_opponent_id}`);
            console.log(`matched up`);
            await FS.deleteDoc(matchOpenedRef);
            unsubscriber();
            res("ok");
          },
        });
        console.log(`listening closed doc: ${matchClosedRef.id}`);
        await FS.updateDoc(matchOpenedRef, { closed_match_id: matchClosedRef.id });
        console.log(`write closed_match_id into opened doc: ${matchClosedRef.id}`);
      }));
      
      // 5. ゲーム開始
      return Game.init2pGame(
        matchClosedRef.id,
        player,
        opponent_id!,
        true,
      );

    } else {
      // [ドキュメントがある場合]
      const openedDoc = opened_docs[0];
      console.log(`found opened doc: ${openedDoc.id}`);
      const closed_match_id = await (new Promise<string>(async (res, rej) => {
        let rejected = false;
        // 1. `match_opened`ドキュメントに対して自分のIDを書き込む。
        await updateDoc(openedDoc.ref, { opponent_id: player.id });
        // 2. `match_opened`ドキュメントをlisten
        const unsubscriber = FS.onSnapshot(openedDoc.ref, {
          next: async (snapshot) => {
            if (rejected) { return; }
            if (!snapshot.exists) { rejected = true; unsubscriber(); rej("deleted"); return; }
            // 3. `match_opened`ドキュメントの`closed_match_id`に値が入ったら、対応する`match_closed`ドキュメントを見に行く。
            const closed_match_id = snapshot.get("closed_match_id");
            if (!closed_match_id) { return; }
            console.log(`receipt id: ${closed_match_id}`);
            // 4. `match_opened`ドキュメントのlistenを解除
            unsubscriber();
            res(closed_match_id);
          },
        });
        console.log(`listening opened doc: ${openedDoc.id}`);
      }));
      // 5. `match_closed`ドキュメントの`opponent_id`が自分と同じだったら、ゲーム開始
      const closedMatch = await FS.getDoc(FS.doc(db, ColClosed, closed_match_id));
      const { registerer_id, opponent_id } = closedMatch.data() || {};
      if (!registerer_id || !opponent_id || opponent_id !== player.id) {
        console.log("failed to match up");
        return null;
      }
      return Game.init2pGame(
        closedMatch.id,
        player,
        opponent_id!,
        false,
      );

    }

  }

  export async function openMatch(player: M4Player.PlayerData) {
    // const db = FS.getFirestore();
    // const ref = await FS.addDoc(FS.collection(db, ColOpened), {
    //   test: "ok",
    // });
    return null;;
  }
};