SQLite（手動キャッシュ）:
key: ["vrc", "db", "***", "*id*"]
useAvatar, useUser, ...etc
アバターやユーザーなど，個別にIDで引いたり，将来的に「お気に入り数順にソートしてローカル検索したい」といった構造的な操作が必要なもの

TanStack Persisters（自動永続化）:
key: ["vrc", "state", "***"]
useFavorites, useFavAvatars, ...etc
フレンド一覧やお気に入りリミットなど，「APIから来た塊をそのまま保存し，オフライン時にとりあえず出したい」というステートの復元が目的のもの
