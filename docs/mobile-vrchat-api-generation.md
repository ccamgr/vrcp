# Mobile VRChat API / Pipeline 型生成の互換調整

## 対象と原則

Mobile の VRChat API クライアントは `mobile/src/generated/vrcapi/`、Pipeline 型は `mobile/src/generated/vrcpipline/type.ts` に生成する。これらの生成物は直接編集しない。公式仕様と生成器の組み合わせで型エラーや名称衝突が発生した場合は、`mobile/makefile` または `mobile/tools/gen-vrcpipe.ts` に再生成可能な調整を置く。

生成前後には、リポジトリルートで次を実行する。

```bash
cd mobile
make gen-vrcapi
make gen-vrcpipe
cd ..
git diff --check -- . ':(exclude)mobile/src/generated/**'
```

`gen-vrcapi` と `gen-vrcpipe` は公式 URL を取得するため、同じ手順でも公式仕様の更新により差分が変わり得る。生成結果を更新する pull request では、取得日時と公式仕様の差分を確認する。

## OpenAPI: `Transaction.agreement` の名称衝突

### 現象

公式 OpenAPI の `Transaction.agreement` は、文字列または `TransactionAgreement` モデルを取る inline `oneOf` である。`typescript-axios` generator はこの inline 型を `TransactionAgreement` と命名する場合があり、既存モデルと同名になる。

名称が衝突すると、次の無効な自己参照型が生成され、TypeScript の検査が失敗する。

```ts
type TransactionAgreement = TransactionAgreement | string;
```

### 対応

`mobile/makefile` の `gen-vrcapi` に次の mapping を維持する。

```make
--inline-schema-name-mappings "Transaction_agreement=TransactionAgreementValue"
```

これにより inline union は `TransactionAgreementValue`、モデル本体は `TransactionAgreement` となる。

```ts
type TransactionAgreementValue = TransactionAgreement | string;
```

`--additional-properties="useSingleRequestParameter=true"` は既存の API 呼び出し形式を維持する設定である。削除すると、生成された API が `{ userId }` の単一オブジェクト引数ではなく個別引数を取る形に変わり、既存の呼び出し箇所との互換性が崩れる。

## Pipeline: 現行 WebSocket ドキュメントの JSON 例

### 現象

`mobile/tools/gen-vrcpipe.ts` は公式 WebSocket MDX の `json` code fence を読み取る。現行ドキュメントには、Pipeline event ではないエラー例、`"<additional>"` のようなプレースホルダーキー、および `<value>` のような任意値プレースホルダーが含まれる。

従来の処理ではこれらを JSON として読めず、`make gen-vrcpipe` が失敗する。

### 対応

ジェネレータは次を行う。

- placeholder key を通常の JSON key に変換する。
- `<value>` を TypeScript の `unknown` として出力する。
- `type` がない code fence を Pipeline event ではない例として除外する。
- JSON 構文エラー時は、処理対象の例を表示して失敗する。

これらは一般的なドキュメント表記の処理であり、特定イベントの生成結果を直接書き換えるものではない。

## Pipeline: `GroupLimitedMember` の廃止

### 現象

公式 WebSocket ドキュメントの `group-member-updated` 例は `GroupLimitedMember` を参照する。一方、現行 OpenAPI ではこのモデルがなくなり、同等の group member 情報は `GroupMember` として公開されている。このまま再生成すると `_API.GroupLimitedMember` の未解決参照になり、型検査に失敗する。

### 対応

`manuallyFixDefinitions()` で、生成された Pipeline 型の `_API.GroupLimitedMember` を `_API.GroupMember` に置換する。

```ts
content = content.replace(/_API\.GroupLimitedMember/g, "_API.GroupMember");
```

この置換は `make gen-vrcpipe` のたびに適用される。`GroupMember` は旧 `GroupLimitedMember` の項目を包含する現行 OpenAPI モデルであり、イベント受信側の互換型として使う。

## 更新時の確認

公式仕様または generator を更新する場合は、次を確認する。

1. `make gen-vrcapi` と `make gen-vrcpipe` が成功すること。
2. `npx tsc --noEmit` が成功すること。
3. `TransactionAgreementValue` が `TransactionAgreement | string` になり、自己参照型がないこと。
4. `GroupMemberUpdatedPipelineContent.member` が `_API.GroupMember` を参照すること。
5. `git diff --check -- . ':(exclude)mobile/src/generated/**'` が成功すること。

公式仕様が `GroupLimitedMember` を復活させる、または WebSocket ドキュメントが `GroupMember` を直接参照するようになった場合は、対応する置換を削除し、生成結果と利用側の型を再確認する。
