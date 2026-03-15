import http from "http";
import https from "https";
import url from "url";

const server = http.createServer((req, res) => {

  const query = url.parse(req.url, true).query;
  const target = query.url;

  if (!target) {
    res.end("Missing url");
    return;
  }

  https.get(target, (r) => {
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res);
  }).on("error", () => {
    res.end("Stream error");
  });

});

server.listen(3000);
