import { parse } from "csv/sync";
import { cpSync, readFileSync, rmSync, write, writeFileSync } from "fs";

interface ReadingRecord {
  name: string;
  pinyin: string;
  importance: number;
}

interface Assembly {
  name: string;
  elements: string[];
  importance: number;
}

// should be CJK or ext A
function isValid(code: number) {
  return (
    (0x4e00 <= code && code <= 0x9fff) || (0x3400 <= code && code <= 0x4dbf)
  );
}

function getReadings() {
  const readings: ReadingRecord[] = parse(
    readFileSync("assets/readings.csv", "utf-8"),
    { delimiter: "\t", cast: true, columns: true }
  );
  return readings;
}

function getAnalysis() {
  const analysis: { name: string; analysis: string }[] = parse(
    readFileSync("assets/analysis.csv", "utf-8"),
    { delimiter: "\t", columns: true }
  );
  return new Map(
    analysis.map(({ name, analysis }) => [name, analysis.split(" ")] as const)
  );
}

function getFrequency() {
  const raw: { name: string; frequency: string }[] = parse(
    readFileSync("assets/frequency.csv", "utf-8"),
    { delimiter: "\t", columns: true }
  );
  const frequency = new Map(
    raw.map(({ name, frequency }) => [name, parseInt(frequency)] as const)
  );
  const singleFrequency = new Map<string, number>();
  for (const [name, freq] of frequency) {
    for (const single of [...name]) {
      singleFrequency.set(single, (singleFrequency.get(single) ?? 0) + freq);
    }
  }
  return { frequency, singleFrequency };
}

function assemble() {
  const readings = getReadings();
  const analysis = getAnalysis();
  // 1. 为所有有拆分、有读音的字生成序列表
  const assemblyList: Assembly[] = [];
  const assemblyHash = new Map<string, number>();
  const finished = new Set<string>();
  for (const { name, pinyin, importance } of readings) {
    const elements = structuredClone(analysis.get(name));
    if (!elements) continue;
    const firstLetter = pinyin[0]!;
    const lastLetter = pinyin[pinyin.length - 2]!;
    if (elements.length < 3) {
      elements.push(firstLetter.toUpperCase());
    }
    if (elements.length < 3) {
      elements.push(lastLetter.toUpperCase());
    }
    const hash = name + "," + elements.join(",");
    if (assemblyHash.has(hash)) {
      const index = assemblyHash.get(hash)!;
      assemblyList[index].importance += importance;
      continue;
    }
    assemblyList.push({
      name,
      elements,
      importance,
    });
    assemblyHash.set(hash, assemblyList.length - 1);
    finished.add(name);
  }
  // 2. 为所有有拆分、无读音的字生成序列表
  for (const [name, elements] of analysis) {
    if (finished.has(name)) continue;
    if (elements.length < 3) {
      elements.push("?");
    }
    if (elements.length < 3) {
      elements.push("?");
    }
    assemblyList.push({
      name,
      elements,
      importance: 100,
    });
  }
  return assemblyList;
}

interface RootRecord {
  root: string;
  key: string;
  alias: string;
}

function getKeyMap() {
  const roots: RootRecord[] = parse(
    readFileSync("assets/keymap.csv", "utf-8"),
    { delimiter: "\t", columns: true }
  );
  const keyMap = new Map<string, { key: string; alias: string }>();
  for (const { root, key, alias } of roots) {
    if (root[0]! !== "<" && !isValid(root.codePointAt(0)!)) {
      console.error(`Invalid key: ${root}`);
      continue;
    }
    for (const [index, ascii] of [...key].entries()) {
      const subroot = index === 0 ? root : `${root}.${index}`;
      keyMap.set(subroot, { key: ascii, alias: alias === "" ? root : alias });
    }
  }
  return keyMap;
}

function toFull(element: string) {
  return String.fromCodePoint(element.codePointAt(0)! + 0xfee0);
}

function main() {
  const assemblyList = assemble();
  const keyMap = getKeyMap();
  const { frequency, singleFrequency } = getFrequency();
  const brevity = new Map(
    parse(readFileSync("assets/brevity.csv", "utf-8"), {
      delimiter: "\t",
    }) as [string, string][]
  );
  const specialty = new Map(
    parse(readFileSync("assets/specialty.csv", "utf-8"), {
      delimiter: "\t",
    }) as [string, string][]
  );
  rmSync("build", { recursive: true, force: true });
  cpSync("config", "build", { recursive: true });
  cpSync("lua", "build/lua", { recursive: true });

  const dictionary = readFileSync("build/c42.dict.yaml", "utf-8").split("\n");
  for (const [word, code] of brevity) {
    const freq = singleFrequency.get(word) ?? frequency.get(word) ?? 0;
    dictionary.push(`${word}\t${code}\t${freq}`);
  }
  for (const { name, elements, importance } of assemblyList) {
    const freq = Math.round(
      ((singleFrequency.get(name) ?? 0) * importance) / 100
    );
    const code = elements
      .map((element) => keyMap.get(element)?.key ?? element)
      .join("");
    if (brevity.has(name)) {
      // 全码后置
      dictionary.push(`${name}\t${code}\t${0}`);
    } else if (specialty.has(name)) {
      // 专码后置
      dictionary.push(`${name}\t${specialty.get(name)}\t${freq}`);
      dictionary.push(`${name}\t${code}\t${0}`);
    } else {
      dictionary.push(`${name}\t${code}\t${freq}`);
    }
  }
  writeFileSync("build/c42.dict.yaml", dictionary.join("\n"));

  const assembly = assemblyList.map(({ name, elements }) => {
    const hint = elements
      .map((element) => keyMap.get(element)?.alias ?? toFull(element))
      .join("");
    return `${name}\t${hint}`;
  });
  writeFileSync("build/lua/c42/assembly.txt", assembly.join("\n"));

  const association = new Map<string, string[]>();
  for (const { name } of assemblyList) {
    association.set(name, []);
  }
  for (const [word] of frequency) {
    const characters = [...word];
    if (characters.length < 2) continue;
    const single = characters[0]!;
    association.get(single)?.push(word);
  }
  const entries: string[] = [];
  for (const [character, words] of association) {
    for (const [index, word] of words.entries()) {
      if (index >= 5) break;
      entries.push(
        `${word}\t${character}\t${Math.min(words.length, 5) - index}`
      );
    }
  }
  writeFileSync("build/c42.import.txt", entries.join("\n"));
}

main();
