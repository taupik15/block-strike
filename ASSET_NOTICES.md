# Third-party asset notes

BLOCK STRIKE is a fan-made browser game. The user-supplied `default-weapon-models.zip` contains Counter-Strike / GoldSrc first-person weapon models (`.mdl`) and weapon sound files (`.wav`). The source download page describes the pack as the original CS 1.6 weapon models and sounds.

## Source attribution

- Download page: https://cs16planet.ru/modeli-oruzhiya-cs-16/26189-standartnye-modeli-oruzhija-dlja-cs-16.html
- Site rules: https://cs16planet.ru/rules/
- Required source credit based on the site's published general rule: **CS16planet.ru — “Стандартные модели оружия и звуки для CS 1.6”**, with a direct, active link to the download page above.

The published site rules state that copying and using materials from the site is permitted only with author attribution and a direct, active source link. This project records that attribution and source link here.

## Rights limitation

The source archive itself contains no license, licence, readme, copyright, or notice file. The download page describes the files as original Counter-Strike 1.6 models and sounds, but it does not provide a specific license for the underlying model/audio works or expressly explain whether users may convert, repackage, redistribute, or publicly host those third-party assets. The site's attribution rule is not treated here as definitive proof that every underlying rights holder has granted those permissions.

- The converted GLB models and copied WAV files are included in this local project build at the user's request.
- Converting an MDL file to GLB does not change ownership or grant additional rights.
- Before publishing the models or WAV files through GitHub Pages or another public host, obtain confirmation that the source/rights holders permit conversion and redistribution, or replace the assets with appropriately licensed alternatives.
- The project's own HTML, CSS, and JavaScript are separate from the rights to the third-party game assets.


## Tahap 8 — paket input dan konversi

| Sumber | Penggunaan / format | Status hak yang diketahui |
|---|---|---|
| ZIP game Tahap 7 dari pengguna | Karakter CT/T GLB; map BSP yang telah diekspor; tekstur, skybox, props; kode baseline | Atribusi lama dipertahankan. Tidak ditemukan grant baru untuk redistribusi publik semua aset |
| default-weapon-models.zip | 31 v_ MDL → animated GLB, 31 p_ MDL → bone-local GLB, 34 w_ MDL → GLB/ikon PNG; 165 WAV | Kredit CS16planet.ru di atas tetap berlaku; underlying asset rights tidak otomatis diberikan oleh konversi |
| hud-armory-xtreme-cs16forge.zip | SPR → atlas PNG; shield pada HUD memakai 640hud7 | cs16forge.txt disertakan utuh di root; lihat batas publikasi berikut |
| CSGO_GUI1.6_Fixed.zip | TGA/RES/config diperiksa; konversi PNG dan warna GUI yang sudah ada pada Tahap 7 dipertahankan | Tidak ditemukan lisensi distribusi lengkap pada paket. RES tidak dieksekusi oleh browser |
| Three.js 0.128.0 | three.min.js, GLTFLoader.js, SkeletonUtils.js dibundel lokal | MIT, copyright dan lisensi lengkap di js/vendor/LICENSE |
| Ikon ammo/nightvision/cross | SVG dibuat untuk build ini | Bagian kode/grafik tambahan proyek; tidak mengambil artwork manusia dari GUI |

### HUD / CS16Forge

Sumber: https://cs16forge.com/hud/full/hud-armory-xtreme/

Berkas sumber menyatakan: “Free for personal use, your own game server and game builds.” Berkas itu juga meminta notice dipertahankan dalam root build, meminta berbagi tautan sumber daripada mengunggah ulang arsip, dan menyatakan “Any other republishing requires our written permission.” Ketentuan ini dicatat sebagai bukti yang ada, bukan dianggap sebagai izin tanpa batas untuk publikasi web seluruh karya asal. Hak karya asli tetap pada penulisnya. Notice dan hash sumber ada di `cs16forge.txt`; terms: https://cs16forge.com/terms/ .

### Map dan karakter

Map KVARTAL mencantumkan penulis **Smith** pada `assets/maps/cs16-kvartal/*_KVARTAL.txt`; file tersebut dipertahankan. Nama mode pada resource asal tidak berarti objective hostage/VIP/escape sudah tersedia di browser. Karakter dan senjata berasal dari ekosistem Counter-Strike/GoldSrc; build ini bukan produk resmi Valve.

### Turunan visual

Ikon senjata dibuat dengan render ortografik model world asli, tanpa karakter. Preview class dibuat dari model karakter dan held weapon yang sama dengan runtime. Background menu merupakan render peta game lokal. Konversi tidak mengubah kepemilikan atau memberi lisensi baru. Paket akhir disediakan sebagai hasil kerja lokal atas file pengguna; izin publikasi pihak ketiga tetap perlu dipastikan sebelum redistribusi publik.

Alpha 45 tekstur foliage map hasil ekspor Tahap 7 diperbaiki (palette key hitam menjadi transparan); warna RGB, geometri, dan graf navigasi tidak diubah oleh langkah ini. Daftar dan skrip konversinya disertakan di `tools/foliage-alpha.json` dan `tools/fix_prop_alpha.py`.


## Tahap 10: empat arsip disediakan pengguna

- `bot_chatter_remixed.rar`: sumber klip bot radio/chatter WAV, 491 nama entry. Dipilih 42 klip relevan, dikonversi ke `assets/phase10/audio/bot/*.mp3`. Sebagian entry RAR tidak dapat didekompresi bersih dengan libarchive; gunakan hanya hasil ffprobe valid.
- `radio_remixed.rar`: 44 WAV radio CS, dikonversi ke `assets/phase10/audio/radio/*.mp3`.
- `muzzle_flash_pack.7z`: file GoldSrc `muzzleflash1.spr`, `muzzleflash2.spr`, `muzzleflash3.spr`; first frame dikonversi menjadi PNG transparan `assets/phase10/fx/muzzleflash*.png`.
- `hd_blood_packed_by_ralex_08.7z`: file GoldSrc decals WAD3 dua varian; sebagian blood/bigblood dikonversi menjadi PNG RGBA.

**Hak penggunaan dan redistribusi paket mod pihak ketiga belum diverifikasi.** Keempat arsip aslinya tidak disertakan di rilis untuk menghindari menggandakan sumber mentah. Hasil konversinya tetap mungkin tunduk pada hak cipta paket asli. Nilai penerbitan publik perlu ditinjau oleh pemilik proyek.


### Tahap 11 character reskin
`assets/models/t/arctic.glb` dan `assets/ui/classes/arctic.png` merupakan **reskin warna dari aset karakter pengguna yang telah tersedia pada Tahap 10**, bukan model geometri orisinal baru. Hak model/tekstur sumber mengikuti hak pemilik aslinya. Tidak ada model baru yang diunduh untuk Tahap 11.

## CS 1.6 Google Drive source ZIPs (checkpoint)

Converted VGUI icons and 29 effect WAV files were supplied via two Google Drive ZIPs. Publisher/rights: Valve and/or other rights holders; public redistribution rights have not been verified. The developer must verify licensing before public deployment. See CS16_GDRIVE_INTEGRATION.md.


## CS 1.6 supplemental import (18 November 2026)
From the two user-provided CS16.Weba.Ru archives, this checkpoint includes decoded GUI sprites, source VGUI cards, selected WAV effects, original CT/T character models, and original radio files.
The source archives also contain copyrighted Valve / modder-created material. Possession of the files or access to the CS16.Weba site does not establish permission for republishing them on a public GitHub Pages website. Treat this package as a private testing build until asset redistribution rights are verified.
Only inert source `.res`/`.txt` layout samples were retained. Server modules/plugins, cheat files, map textures and BSP content were not imported.


## Batch 15A original Google Drive shield sources

Owner supplied `cs16_files-02.zip` (link recorded in `BATCH15A_SOURCE_HOLD.md`), containing `models/shield/v_shield_*.mdl` source files. Nine first-person sources were converted to GLB and packaged for the owner's working game build. The original `.mdl` source ZIP and unused `p_shield_*` models are not included in the distributable. These are Counter-Strike/GoldSrc-derived assets and **the Drive file's sharing permission is not itself a redistribution license**. The 15A GLBs remain subject to the original rights; confirm permission before public deployment.


## Batch 15B source-derived grenade sprite frames

At the owner's request, 26 PNG frames under `assets/cs16-grenade-fx/` were extracted from `cs16_files-02.zip` on Google Drive. The original source members are `sprites/muzzleflash2.spr`, `sprites/fast_wallpuff1.spr`, `sprites/3dmflaora.spr`, and `sprites/black_smoke3.spr`. `manifest.json` preserves individual source SHA-256 digests and chosen frame indices. The small radial transparency change to the original flash sprite is technical alpha cleanup, **not proof of new ownership**. Source CS/GoldSrc graphics remain third-party works. Neither Drive sharing nor conversion constitutes a license for public redistribution.

## Critical Gameplay Fixes — native grenade sprites

`assets/cs16-grenade-fx/black_smoke3.spr` and `smokepuff.spr` are byte-for-byte copies from the owner's `cs16_files-02.zip`. SHA-256 digests are `8539f22177ae5ec673316d76939211dc9dc1c1c2dacdb6a52e100e1e7d5c15ea` and `2be5eaa3f9fea75390c24fc35c072dd29cd013b3c2a266e3ce254e085dd1012d` respectively. The game uses these frames for Smoke and the post-detonation puff. The same private-testing and public redistribution limitations above apply. The owner's two original archive links are recorded in [BATCH15A_SOURCE_HOLD.md](BATCH15A_SOURCE_HOLD.md).

Game and format behavior was checked against ReGameDLL-CS, YaPB and PODBot references. The release includes the project's own implementations. See [QA-CRITICAL-GAMEPLAY.md](QA-CRITICAL-GAMEPLAY.md).

## GoldSrc Sprite Integration

The separately attached `sprites.zip` is loaded from a file picker in the user's browser. The archive includes no verifiable redistribution grant. Its bytes and generated artwork were excluded from the original sprite integration release. Batch 16.3 supplies a separate private/authorized-use build containing only the owner-supplied ZIP unchanged, and a code-only alternative. No new redistribution permission was established. See [SPRITE-INTEGRATION.md](SPRITE-INTEGRATION.md).

## Batch 16.3 supplied archive

- Path (private/authorized-use variant only): `assets/goldsrc/sprites.zip`.
- Original owner-provided file: `sprites.zip`, 2,237,485 bytes.
- SHA-256: `db6e06de8bc55f225bb34b5dedee93d1e9979923cdee9cbc247bf4c9c9807c67`.
- No license/notice/copyright/readme was found inside this archive. Keep this build local unless rights to publish the assets are established. For public code deployment without adding this unverified archive, use the code-only alternative and the existing device-local import. Existing baseline third-party notices still apply to both variants.

## Batch 16.4F–H equipment bodygroups
The two newly generated GLBs derive from player model bodygroups in the owner's supplied `cs16_files-02.zip`, not newly licensed assets. `qa/batch164fh/extract-gear.py` documents the conversion. The meshes and textures remain third-party works; no public redistribution permission has been verified. Use the bundled models only locally or with authorization. All previously supplied asset bytes remain unchanged.
- `assets/models/equipment/bomb-carrier.glb`: original T backpack bodygroup, Backpack1.BMP, 44 triangles; SHA-256 `2c9ab220586253c7cb7dc63eb47d87ba6386f3722e3af81d64ad4c2d791b4b4f`.
- `assets/models/equipment/defuse-kit.glb`: original CT kit bodygroup, Backpack2.BMP, 80 triangles; SHA-256 `4c0310b269a059a13cf386755c3f9fb3d523422594fd631c15647596cd0af801`.

## Batch 16.4L–O radio marker
`assets/cs16-sprites/radio-marker.png` is a gold-colored fallback derived from the existing `radio.png` alpha mask; actual bundled `radio.spr` is preferred. No new voice samples were downloaded. The existing bot complaint and radio assets are reused. This derivative does not establish redistribution rights; preceding source notices apply.

### Batch 16.4.4 material classification
`js/combat12.js` includes texture-to-material tags derived from the user-supplied `cs16_files-02.zip` (`cs16_files/sound/materials.txt`). No binary assets added or modified. Third-party redistribution authorization remains unverified; use only with appropriate permission.

### 16.4.7-anim1 character animation expansion
Source: owner-supplied `cs16_files-02.zip` (same original model source recorded for previous integrations). Append native GoldSrc sequence tracks to the eight existing classic character GLBs; no new textures or mesh geometry. The converter and per-source SHA-256 inventory are in `qa/batch1647anim/`. No raw source files included. Original rights still apply; permission for public redistribution is not verified. Keep local unless authorized.

## YaPB GRAPH database (pre26N)
Source: https://github.com/yapb/graph via user-provided graph-master 2.zip. All original GRAPH bytes preserved in losslessly packed shards. GRAPH data is CC BY-SA 4.0; preserved individual attribution, README and complete licenses under `assets/yapb-graph/`. Other original database materials use the Unlicense as specified in the upstream README. Existing third-party asset rights limitations remain unchanged.

## Universal WAD Manager (pre26AR.2)
The 23 WAD3 archives from the owner's supplied `CS16-WAD-Collection.zip` (extracted from `cs16_files-01.zip` and `cs16_files-02.zip`) and the separately supplied `halflife.wad` are stored unchanged in lossless raw chunks under `assets/wad/`. `index.json` records each original archive's size, SHA-256, chunk sequence and supported miptexture records. No rights to publicly redistribute these third-party archives have been established. This WAD-inclusive build is for local/private or otherwise authorized use only. Do not publish these assets to GitHub Pages without the appropriate rights.


## M1887 Silver (imported as M3 visual replacement)
User supplied `m1887_silver.rar` includes v_m3.mdl, p_m3.mdl, w_m3.mdl, WAV and preview. Attribution in image: **mb.michael**; animation sequence labels credit **KeenHide**. Redistribution permission was not verified. Do not claim these assets are open source. Local weapon ZIP imports remain on the player device.
