import _ from 'lodash';
import * as FS from "firebase/firestore";

export async function askFirstUpdate<T>(
  docref: FS.DocumentReference<FS.DocumentData>,
  predicate: (snapshot: FS.DocumentSnapshot<FS.DocumentData>) => "accept" | "ignore" | "reject",
  transformer: (snapshot: FS.DocumentSnapshot<FS.DocumentData>) => T,
  option: {
    timeout?: number;
  } = {},
) {
  return new Promise<T>((resolve, reject) => {
    let rejected = false;
    const unsubscriber = FS.onSnapshot(docref, {
      next: async (snapshot) => {
        if (rejected) { return; }
        switch (predicate(snapshot)) {
          case "ignore":
              return;
          case "reject":
              unsubscriber();
              rejected = true;
              reject("rejected by predicate");
              return;
          case "accept":
              break;
        }
        unsubscriber();
        resolve(transformer(snapshot));
      },
    });
    if (option.timeout) {
      setTimeout(() => {
        if (rejected) { return ; }
        unsubscriber();
        reject("timeout");
      }, option.timeout);
    }
  });
}

export const Collection = {
  ColClosed: "match_closed",
  ColOpened: "match_opened",
  // ColClosed: "test_match_closed",
  // ColOpened: "test_match_opened",
};
