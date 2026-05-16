import { PLAYER_AVATARS } from "./constants";
import { normalizeName } from "./scoring";

export function getPlayerAvatar(name, heartFaces) {
  const avatar = PLAYER_AVATARS[normalizeName(name)];
  if (!avatar) return null;
  return heartFaces ? avatar.hearts : avatar.normal;
}
