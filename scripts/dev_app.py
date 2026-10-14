"""Serve only public static assets, with directory routing matching Nginx."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class PublicFiles(SimpleHTTPRequestHandler):
    def send_head(self):
        root = Path(self.directory).resolve()
        path = Path(self.translate_path(self.path)).resolve()
        if not path.is_relative_to(root):
            self.send_error(404)
            return None
        parts = path.relative_to(root).parts
        if any(part.startswith(".") or part in {"nginx", "Dockerfile", "Makefile", "README.md", "cloudbuild.yaml"} for part in parts):
            self.send_error(404)
            return None
        return super().send_head()

    def list_directory(self, path):
        self.send_error(404)
        return None

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def create_server(root: Path, host: str):
    public = root / "frontend"
    if not (public / "index.html").is_file():
        raise ValueError(f"Public frontend not found: {public}")
    handler = partial(PublicFiles, directory=str(public))
    return ThreadingHTTPServer((host, 0), handler), {"public_directory": str(public)}
