import _ from 'lodash';
import { v4 } from 'uuid';

export namespace M4Player {
  export type PlayerData = {
    id: string;
    name: string;
    com?: boolean;
  };

  function getPlayerID() {
    const key = "mmmm_player_id";
    if (!localStorage.getItem(key)) {
      const id = v4();
      localStorage.setItem(key, id);
    }
    return localStorage.getItem(key)!;
  }

  export function publishPlayer() {
    return {
      id: getPlayerID(),
      name: "",
      com: false,
    };
  }

  export function publishCom() {
    return {
      id: v4(),
      name: "Com",
      com: true,
    };
  }
}
