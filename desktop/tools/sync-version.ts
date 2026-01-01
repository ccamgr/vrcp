import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ※ desktop/versions.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(path.dirname(__filename)); // desktop
const VERSIONS_PATH = path.join(__dirname, './versions.json');
const TAURI_CONF_PATH = path.resolve(__dirname, './src-tauri/tauri.conf.json');
const CARGO_TOML_PATH = path.resolve(__dirname, './src-tauri/Cargo.toml');

interface VersionData {
  versions: {
    nativeVersion: string;
    updates: { date: string; message: string }[];
  }[];
}
/**
 * npm run tauri の実行前に, versions.json に合わせて
 * - src-tauri/tauri.conf.json
 * - src-tauri/Cargo.toml
 * のバージョンを更新
 */
const main = () => {
  try {
    // 1. versions.json からバージョンを取得
    if (!fs.existsSync(VERSIONS_PATH)) {
      throw new Error(`versions.json not found at: ${VERSIONS_PATH}`);
    }
    const versionsContent = fs.readFileSync(VERSIONS_PATH, 'utf-8');
    const versionsData: VersionData = JSON.parse(versionsContent);
    const newVersion = versionsData.versions[0].nativeVersion;

    console.log(`🚀 Updating Tauri version to: ${newVersion}`);

    // 2. tauri.conf.json の更新
    const tauriConfContent = fs.readFileSync(TAURI_CONF_PATH, 'utf-8');
    const tauriConf = JSON.parse(tauriConfContent);

    if (tauriConf.version !== newVersion) {
      tauriConf.version = newVersion;
      fs.writeFileSync(TAURI_CONF_PATH, JSON.stringify(tauriConf, null, 2) + '\n');
      console.log('✅ tauri.conf.json updated');
    } else {
      console.log('ℹ️  tauri.conf.json is up to date');
    }

    // 3. Cargo.toml の更新 (正規表現で置換)
    let cargoTomlContent = fs.readFileSync(CARGO_TOML_PATH, 'utf-8');
    const versionRegex = /^version\s*=\s*".*"/m;
    if (versionRegex.test(cargoTomlContent)) {
      const newCargoTomlContent = cargoTomlContent.replace(
        versionRegex,
        `version = "${newVersion}"`
      );
      if (cargoTomlContent !== newCargoTomlContent) {
        fs.writeFileSync(CARGO_TOML_PATH, newCargoTomlContent);
        console.log('✅ Cargo.toml updated');
      } else {
        console.log('ℹ️  Cargo.toml is up to date');
      }
    } else {
      console.warn('⚠️  Could not find version field in Cargo.toml');
    }

  } catch (error) {
    console.error('❌ Failed to update version:', error);
    process.exit(1);
  }
};

main();
