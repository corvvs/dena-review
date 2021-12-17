import _ from 'lodash'
import * as FS from "firebase/firestore";

export function mapObject<K extends string, T, U>(
  obj: { [P in K]: T },
  fn: (x: T, k?: K) => U
): { [P in K]: U } {
  const r: any = {};
  Object.keys(obj).forEach(k => {
    const kk = k as K;
    const t = obj[kk];
    console.log(t, kk);
    r[kk] = fn(t, kk);
  });
  return r;
}

export async function PromiseMap<T>(pmap: { [P in keyof T]: Promise<T[P]> }) {
  const r: any = {}
  await Promise.all(Object.keys(pmap).map(key => (async () => {
    r[key] = await pmap[key as (keyof T)]
  })()))
  return r as T
}

export function u_datify(data: any) {
  if (data instanceof Date) { return data; }
  if (typeof data === "number") {
    return new Date(data);
  }
  if (data instanceof FS.Timestamp) { return data.toDate(); }
  if (typeof data === "object" && !_.isNull(data)) {
    if (typeof data._seconds === "number" && typeof data._nanoseconds === "number") {
      return new Date(data._seconds * 1000 + data._nanoseconds / 1000);
    }
  }
  return undefined;
}

export function u_datify_fields(data: any) {
  return _.mapValues(data, (v) => {
    if (!_.isNull(v) && typeof v !== "number") {
      return u_datify(v) || v;
    }
    return v;
  });
}
