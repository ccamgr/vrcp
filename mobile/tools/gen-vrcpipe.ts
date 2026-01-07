

// "https://github.com/vrchatapi/vrchat.community/blob/main/content/docs/(guides)/websocket.mdx";
const RAW_MDX_URL = "https://raw.githubusercontent.com/vrchatapi/vrchat.community/refs/heads/main/content/docs/(guides)/websocket.mdx";
const OUTPUT_PATH = "src/generated/vrcpipline/type.ts";

const importName = "_API"

async function fetchMdxContent(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch MDX file: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

// extract all ```json ... ``` blocks
function extractExplaination(mdxcontent: string): string[] {
  const regex = /^```json\n(.*?)\n^```/gms;
  const matches = mdxcontent.matchAll(regex);
  const results = Array.from(matches, match => match[1]);
  return results;
}

function preprocessExplanation(explanation: string): string {
  let preprocessed = explanation;
  // if <xxxx Object> in comments, replace the line with <obj-xxxx>
  preprocessed = preprocessed.replace(/"(\w+)"\s*:\s*{[\s\n]*\/\/\s*<(\w+)\s+Object>[\s\S]*?}/g, '"$1": <obj-$2>');
  // remove comments
  preprocessed = preprocessed.replace(/\/\/.*$/gm, '');
  // remove trailing commas
  preprocessed = preprocessed.replace(/,\s*([\]}])/g, '$1');
  // replace <xxxx> with "<xxxx>"
  preprocessed = preprocessed.replace(/<([a-zA-Z0-9_-]+)>/g, '"<$1>"');
  //replace ":xxxx" with "<string-xxxx>"
  preprocessed = preprocessed.replace(/":([a-zA-Z0-9_-]+)"/g, '"<string-$1>"');
  //replace ":?xxxx" with "<string?-xxxx>"
  preprocessed = preprocessed.replace(/":\?([a-zA-Z0-9_-]+)"/g, '"<string?-$1>"');
  return preprocessed;
}

function parseExplanation(preprocessed: string): {type: string, content: Object | null} {
  const parsed = JSON.parse(preprocessed);
  if (typeof parsed.type !== "string") {
    console.error("Type is invalid:", parsed.type);
    parsed.type = `invalid_${parsed.type.toString()}` ;
  }
  return {type: parsed.type, content: parsed.content};
}


/** convert strings for Typescript interface definition */


function pascalCase(str: string): string {
  // separate by upperCase letter or hyphen or underscore
  const words = str.split(/(?=[A-Z])|[-_]/).filter(Boolean);
  const pascalWords = words.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  return pascalWords.join('');

}


// write content to file at path
function generateDefinitionFile(content: string, path: string): void {
  const fs = require('fs');
  fs.writeFileSync(path, content);
  console.log(`Type definition file generated at ${path}`);
}


function generateDefinitionFileContent (objs :  {type: string, content: Object | null}[]): string {
  const typeMap = new Map<string, Object | null>();
  objs.forEach(o => {
    typeMap.set(o.type, o.content);
  });
  const types = Array.from(typeMap.keys());

  const definitions = "// This file is generated automatically by a script(gen-type.ts).\n// Don't modify manually!\n\n"
    + createimportStatements() + "\n\n"
    + createOtherDefinitions() + "\n\n"
    + createEnums(types) + "\n\n"
    + createConditionalTypes(types) + "\n\n"
    + types.map(t => createEachContentDefinition(t, typeMap.get(t) || null)).join("\n\n");

  return definitions;
}

function createimportStatements(): string {
  return `import * as ${importName} from "../api";`;
}


function createOtherDefinitions(): string {
  const def1 = `
export interface PipelineRawMessage<T extends PipelineType = PipelineType> {
  type: T;
  content?: string | null; // JSON string
}`;
  const def2 = `
export interface PipelineMessage<T extends PipelineType = PipelineType> {
  timestamp: number; // milliseconds
  type: T;
  content?: PipelineContent<T>;
}`;

  return def1 + "\n" + def2;
}

function createEnums(types: string[]): string {
  const valueStr = `export const PipelineType = [\n  ${types.map(t => `'${t}'`).join(",\n  ")}\n] as const;`;
  const typeStr =  `export type PipelineType = typeof PipelineType[keyof typeof PipelineType];`

  return valueStr + "\n" + typeStr;
}

function createConditionalTypes (types: string[]) : string {
  const conditionalTypes = types.map((type) =>
    `T extends '${type}'\n? ${pascalCase(type)}PipelineContent\n: `
  ).join("");

  return `export type PipelineContent<T extends PipelineType> = ${conditionalTypes}null;`
}

function createEachContentDefinition(type: string, content: Object | null): string {
  const interfaceName = pascalCase(type) + "PipelineContent";
  if (!content) {
    return `export type ${interfaceName} = null;`;
  }
  let fields = JSON.stringify(content, null, 2);
  // find "<xxxx>" and replace (param is xxxx)
  const replacer = (v: string) => {
    if (v.startsWith("obj-")) { // obj-xxxx -> Xxxx
      return `${importName}.${pascalCase(v.slice(4))}`;
    } else if (v.startsWith("string-")) { // string-xxxx -> string
      return "string";
    } else if (v.startsWith("string?-")) { // string?-xxxx -> string | undefined
      return "string | undefined";
    } else {
      return v;
    }
  }
  fields = fields.replace(/"<([?a-zA-Z0-9_-]+)>"/g, (_, v) => replacer(v));
  // remove quotes from keys and partial
  fields = fields.replace(/"([a-zA-Z0-9_-]+)"\s*:/g, '$1:');

  // replace [ xxxx ] with xxxx[]
  fields = fields.replace(/\[\s*([^\[\]]+?)\s*\]/gm, (_, v) => `${v.trim()}[]`);

  // replace {} with Record<string, any>
  fields = fields.replace(/{\s*}/g, 'Record<string, any>');


  // optional formatter
  // replace last comma(json) with semicolon(ts) and add semicolon before }
  fields = fields.replace(/,$/gm, ';');
  fields = fields.replace(/(\S+)\n(\s*)}/g, '$1;\n$2}');


  // wrap with interface
  return `export type ${interfaceName} = ${fields}`
}



/** 例外的処理を記述 */
function manuallyFixDefinitions(content: string): string {
  content = content.replace(/"dateTimeString"/g, 'string'); // NotificationV2.expiresAt
  content = content.replace(/userid/g, 'userId'); // FriendActive.userId
  return content;
}



function main () {
  fetchMdxContent(RAW_MDX_URL).then((mdxcontent) => {
    const explanations = extractExplaination(mdxcontent);
    const parsedExplanations = explanations.map(explanation => {
      const preprocessed = preprocessExplanation(explanation);
      return parseExplanation(preprocessed);
    });
    const definitionContent = generateDefinitionFileContent(parsedExplanations);
    const fixedDefinitionContent = manuallyFixDefinitions(definitionContent); // fix &quot; to "
    generateDefinitionFile(fixedDefinitionContent, OUTPUT_PATH);

  }).catch(console.error);

}

main();
