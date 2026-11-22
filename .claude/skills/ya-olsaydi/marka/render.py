import sys, base64, functools, http.server, threading
from playwright.sync_api import sync_playwright
root=sys.argv[1]
srv=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(http.server.SimpleHTTPRequestHandler,directory=root))
threading.Thread(target=srv.serve_forever,daemon=True).start()
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/opt/pw-browsers/chromium",args=["--no-sandbox"]); pg=b.new_page()
    pg.on("console",lambda m:print("[page]",m.text)); pg.on("pageerror",lambda e:print("[err]",e))
    pg.goto(f"http://127.0.0.1:{srv.server_port}/index.html"); pg.wait_for_function("window.done===true",timeout=60000)
    for k in ("logo","banner","preview"):
        open(f"{root}/{k}.png","wb").write(base64.b64decode(pg.evaluate(f"window.{k}").split(",",1)[1]))
    b.close()
print("ok")
