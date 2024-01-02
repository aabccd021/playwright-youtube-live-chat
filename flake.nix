{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-23.11";
  };

  outputs = inputs: with inputs.nixpkgs.legacyPackages.x86_64-linux;
    let
      wrappedNode = (runCommand "wrapped-node"
        {
          buildInputs = [ makeWrapper ];
        } ''
        mkdir -p "$out/bin"
        makeWrapper "${nodejs}/bin/node" "$out/bin/node" \
          --set PLAYWRIGHT_BROWSERS_PATH ${playwright-driver.browsers-chromium} \
          --set PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS true
      '');

    in
    {
      packages.x86_64-linux.nodeModules = buildNpmPackage {
        name = "nodeModules";
        src = ./.;
        npmDepsHash = "sha256-mUrkM+TwTIA3ALZemjMmZHyrgYXw08X+ak3jgHLzWZY=";
        dontNpmBuild = true;
        dontNpmPrune = true;
        installPhase = ''
          mkdir $out
          cp -r node_modules/* $out
        '';
      };

      apps.x86_64-linux.npm-install = {
        type = "app";
        program = toString (writeShellScript "install" ''
          ${nodejs}/bin/npm install "$@"  --package-lock-only
          rm -rf node_modules || true

          mkdir node_modules
          nix build .#nodeModules
          cp -r ./result/* node_modules

          chown -R node_modules
        '');
      };

      apps.x86_64-linux.start = {
        type = "app";
        program = toString (writeShellScript "start" ''
          ${wrappedNode}/bin/node index.js
        '');
      };

    };
}
