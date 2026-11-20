MERIDIAN SPACE PROGRAM  v1.0
================================

Build rockets, earn science and explore a scaled-down Solar System, and beyond it,
the nearest stars: Proxima Centauri, Barnard's Star and Tau Ceti.

PLAYING
  The game runs in a modern desktop browser (Chrome, Edge, Firefox, Safari) with
  WebGL 2. A keyboard and mouse are needed. Progress saves automatically in the
  browser; Settings > Backup exports a save file.

HOSTING
  Upload this folder (or the zip) to any static web host. On itch.io, choose
  "HTML" as the project kind and upload the zip: index.html is at the top level.
  The planet maps cannot load when index.html is opened straight from disk, so
  to play locally run a web server in this folder, for example:
      node serve.js            (then open http://localhost:8642)
  Without one the game still runs, with generated terrain instead of real maps.

CREDITS AND LICENCES
  Planet maps: Solar System Scope (https://www.solarsystemscope.com/textures/),
    CC BY 4.0, based on NASA imagery. Ceres, Haumea, Makemake and Eris maps are
    artist's impressions.
  3D engine: three.js r149 (https://threejs.org), MIT License,
    Copyright 2010-2023 three.js authors. See js/vendor/three.min.js.
  Fonts: Barlow Condensed, IBM Plex Sans, IBM Plex Mono via Google Fonts,
    SIL Open Font License 1.1 (loaded online; system fonts are used offline).
  Sound and music: synthesized in the browser with the Web Audio API.
  Adrian: inspired by the planet in "Project Hail Mary" by Andy Weir (2021).
    A fan tribute, not affiliated with the author or publisher.
  Exoplanet and star data: published values; invented worlds are labelled in game.
