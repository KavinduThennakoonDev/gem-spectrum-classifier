{ pkgs, ... }: {
  channel = "stable-23.11";
  packages = [
    pkgs.python311
    pkgs.python311Packages.pip
  ];
  idx.previews = {
    enable = true;
    previews = {
      frontend = {
        command = ["python3" "-m" "http.server" "3000" "--directory" "frontend"];
        manager = "web";
        port = 3000;
      };
      backend = {
        command = ["bash" "-c" "cd backend && pip install -r requirements.txt -q && python app.py"];
        manager = "process";
        port = 5000;
      };
    };
  };
}