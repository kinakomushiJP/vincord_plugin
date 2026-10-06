# Vencord Web Builder

ZIPでVencordプラグインを追加し、GitHub ActionsでVencordをビルドするためのWeb Builderです。

## 仕組み

1. `public/index.html` をWebサイトとして公開
2. GitHubリポジトリにこのプロジェクトを置く
3. Settings → Secrets and variables → Actions に `VENCORD_REPO_TOKEN` を登録
4. サイトからプラグインZIPを選択
5. GitHub APIへビルド用データを送信
6. GitHub ActionsがVencordを取得・プラグインを展開・ビルド
7. 完成したdistをZIP化してArtifactとして公開

## 推奨

ビルド用リポジトリは非公開にしてください。
GitHub tokenはブラウザのlocalStorageやサーバーには保存しない設計です。

## 注意

GitHub Actionsの利用にはGitHubアカウントが必要です。
Vencord本体のライセンス・利用条件、および各プラグインのライセンスに従ってください。
