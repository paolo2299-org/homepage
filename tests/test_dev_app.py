"""Native static routing must not expose deployment files or directory listings."""

from contextlib import contextmanager
import threading
from urllib.error import HTTPError
from urllib.request import urlopen

import pytest

from scripts.dev_app import create_server


@contextmanager
def static_server(tmp_path):
    public = tmp_path / "frontend"
    public.mkdir()
    (public / "index.html").write_text("home")
    (public / "page").mkdir()
    (public / "page/index.html").write_text("page")
    (public / "empty").mkdir()
    (public / "Dockerfile").write_text("private deployment file")
    (tmp_path / "secret").write_text("must not be served")
    (public / "external").symlink_to(tmp_path / "secret")
    server, _assets = create_server(tmp_path, "127.0.0.1")
    worker = threading.Thread(target=server.serve_forever)
    worker.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        worker.join()
        server.server_close()


def test_pages_and_directory_index(tmp_path):
    with static_server(tmp_path) as url:
        with urlopen(url) as response:
            assert response.read() == b"home"
            assert response.headers["Cache-Control"] == "no-cache"
        with urlopen(url + "/page/") as response:
            assert response.read() == b"page"


@pytest.mark.parametrize("path", ["/empty/", "/Dockerfile", "/external", "/.env"])
def test_private_or_unlisted_paths_are_404(tmp_path, path):
    with static_server(tmp_path) as url:
        with pytest.raises(HTTPError) as error:
            urlopen(url + path)
        assert error.value.code == 404
