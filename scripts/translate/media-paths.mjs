// Bildeadressene i den engelske teksten hentes fra den norske (beslutning 0008). Norsk og engelsk side bruker samme
// fil i public/media/, og en oversettelse fra forrige publisering kan ha en gammel adresse (et bilde som er byttet
// eller har fått nytt navn). Har teksten like mange adresser på begge språk, settes de norske inn i samme rekkefølge.
// Ellers står den engelske teksten som den er, til den oversettes på nytt.
const MEDIA = /\/media\/[^\s)"'\]<>]+/g;

export function syncMediaPaths(norwegian, english) {
  if (typeof english !== "string") return english;
  const no = norwegian.match(MEDIA) ?? [];
  const en = english.match(MEDIA) ?? [];
  if (!no.length || no.length !== en.length) return english;
  let i = 0;
  return english.replace(MEDIA, () => no[i++]);
}
