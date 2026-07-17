# LLMEasy 文档 SEO 代理配置

Mintlify 负责生成页面 canonical。目前 LLMEasy 页面已经使用完整的 self-canonical URL。前置 Nginx 负责精确的 HTTP 301 重定向，并修正 Mintlify 暂时无法通过 `docs.json` 配置的服务端语言元数据。

## 安装

1. 将 `llmeasy-seo-http.conf` 复制到 Nginx 配置目录，并在 `http` 块中 include。
2. 将 `llmeasy-seo-server.conf` 复制到 Nginx 配置目录，并在现有 `docs.llmeasy.ru` 的 `server` 块中 include。
3. 保持原有 Mintlify `proxy_pass` location 不变。server 配置会关闭上游压缩，让 `sub_filter` 在 Nginx 向访客压缩响应前修改 HTML。
4. 检查并重新加载 Nginx：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 验证

每个旧地址必须返回 `301`；对应新地址必须返回 `200`，并且 canonical 指向当前页面自身：

```bash
curl -sSI https://docs.llmeasy.ru/faq/claude-desktop-cowork-code-gateway
curl -sS https://docs.llmeasy.ru/faq/claude-desktop/cowork-code-gateway | grep -E 'canonical|hreflang|<html lang='
```

检查同一页面的三个语言版本：

```bash
for path in /ai-tools/zed /en/ai-tools/zed /zh/ai-tools/zed; do
  curl -sS "https://docs.llmeasy.ru${path}" | grep -E 'canonical|hreflang|<html lang='
done
```

预期的 `lang` 值分别为 `ru`、`en` 和 `zh-CN`。每个页面都必须互相声明 `ru`、`en`、`zh-CN` 和 `x-default`；`x-default` 指向默认的俄语无前缀路由。
