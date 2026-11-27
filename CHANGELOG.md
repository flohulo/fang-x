# Changelog

## [0.13.0](https://github.com/flohulo/fang-x/compare/fang-x-v0.12.0...fang-x-v0.13.0) (2026-11-27)


### Features

* erste standortmeldung standardmässig sofort nach dem vorsprung ([#121](https://github.com/flohulo/fang-x/issues/121)) ([a29c1b5](https://github.com/flohulo/fang-x/commit/a29c1b5c6f6ac3f9043794b75746b35d083bf367))
* rückmeldung mit sternen und begründung nach der runde ([#113](https://github.com/flohulo/fang-x/issues/113)) ([60f6a96](https://github.com/flohulo/fang-x/commit/60f6a96b643cfd537ec467df2cb1b9fec8d8c415))
* versionsverlauf in der app auf die letzten fünf versionen begrenzen ([#119](https://github.com/flohulo/fang-x/issues/119)) ([68c2e72](https://github.com/flohulo/fang-x/commit/68c2e727816a33306440c2544bd1cfda3076c605))
* x in den letzten spielminuten live für detektive sichtbar ([#114](https://github.com/flohulo/fang-x/issues/114)) ([58dda28](https://github.com/flohulo/fang-x/commit/58dda28e39342276c72268015cc0e0a7f526059a))


### Bug Fixes

* eigener standort ist auch im vorsprung und bei gps-timeout sichtbar ([#112](https://github.com/flohulo/fang-x/issues/112)) ([0cace75](https://github.com/flohulo/fang-x/commit/0cace755cc1f226dac1f871d7c9ffaa17c018b9f))
* frühere sichtungen von x bleiben für detektive auf der karte ([#110](https://github.com/flohulo/fang-x/issues/110)) ([1901c89](https://github.com/flohulo/fang-x/commit/1901c89db1a36e993866272a3fe42ae4048bbb6a))
* letzter bekannter standort anderer spieler bleibt auf der karte ([#111](https://github.com/flohulo/fang-x/issues/111)) ([7cbaa8f](https://github.com/flohulo/fang-x/commit/7cbaa8ff21a636c3f604d9ea04f53d222bb4ff7d))
* neueste messung wird nachgesendet und nach reconnect erneut gemeldet ([#109](https://github.com/flohulo/fang-x/issues/109)) ([04aa70c](https://github.com/flohulo/fang-x/commit/04aa70c3eb0fa73385bbe2c89e4b8d7defe95c66))
* übernommener alter socket setzt spieler nicht mehr offline ([#108](https://github.com/flohulo/fang-x/issues/108)) ([a4de83b](https://github.com/flohulo/fang-x/commit/a4de83b2dbd0d775873b18d5cf47d3980cf14dcc))
* zahlenfelder in den spieleinstellungen einfacher bearbeiten ([#107](https://github.com/flohulo/fang-x/issues/107)) ([1206594](https://github.com/flohulo/fang-x/commit/12065942e300416d69e5192a067487403e144887))

## [0.12.0](https://github.com/flohulo/fang-x/compare/fang-x-v0.11.0...fang-x-v0.12.0) (2026-11-20)


### Features

* eigenen standort markieren und sync-zeit an karten-pins anzeigen ([#105](https://github.com/flohulo/fang-x/issues/105)) ([e43a5a5](https://github.com/flohulo/fang-x/commit/e43a5a5256e44ec23f05fe576fad3884b44d36ee))
* ping-trick für x ergänzen ([#76](https://github.com/flohulo/fang-x/issues/76)) ([e52196e](https://github.com/flohulo/fang-x/commit/e52196e3b04a958c881b51775860c3fe7c81a612))
* sicherheitsheader für die app ausliefern ([#91](https://github.com/flohulo/fang-x/issues/91)) ([9b2c744](https://github.com/flohulo/fang-x/commit/9b2c744062ebe983a40217d168831b6ec04d4c4d))
* statusseite in app, webseite und handbuch verlinken ([#96](https://github.com/flohulo/fang-x/issues/96)) ([784f58a](https://github.com/flohulo/fang-x/commit/784f58a95da2d2f968e8871e147198e9d87488bc))


### Bug Fixes

* fehlerberichte gründlicher bereinigen ([#90](https://github.com/flohulo/fang-x/issues/90)) ([9c3dac2](https://github.com/flohulo/fang-x/commit/9c3dac2c92a038688721f60d76bae283ac6fa347))
* menschen-prüfung an ip binden und im worker rechnen ([#100](https://github.com/flohulo/fang-x/issues/100)) ([c5bad3f](https://github.com/flohulo/fang-x/commit/c5bad3f00f7ee4315ce9611c6be93777c97e7b64))
* nur einen host pro raum vergeben ([#93](https://github.com/flohulo/fang-x/issues/93)) ([48459b9](https://github.com/flohulo/fang-x/commit/48459b94da2f811ff92ca8532c004a49e436280d))
* rate-limits für gruppen im selben netz entschärfen ([#102](https://github.com/flohulo/fang-x/issues/102)) ([c678e0b](https://github.com/flohulo/fang-x/commit/c678e0b4a1f78700fcbc669c9dd8f6623aebeabc))
* regelwerk serverseitig auf bereiche prüfen ([#89](https://github.com/flohulo/fang-x/issues/89)) ([1b509b2](https://github.com/flohulo/fang-x/commit/1b509b2420b7852a2eac7b0f3d266bf9b20fb2be))
* späte beitritte löschen keine ergebnisse mehr ([#99](https://github.com/flohulo/fang-x/issues/99)) ([c6233e5](https://github.com/flohulo/fang-x/commit/c6233e58f8ab34fa84ad6d99d1b0a4bfd07cbe3e))
* spielernamen serverseitig bereinigen ([#95](https://github.com/flohulo/fang-x/issues/95)) ([4e529ce](https://github.com/flohulo/fang-x/commit/4e529ceba5f38a16e80027f0cc0f6f7eb69b32bc))
* sprechfunk-signale und ice-server einschränken ([#103](https://github.com/flohulo/fang-x/issues/103)) ([7f474e9](https://github.com/flohulo/fang-x/commit/7f474e935cee150262b6d34588bfe6279327bccb))
* ticket der menschen-prüfung nicht mehr in der websocket-url senden ([#104](https://github.com/flohulo/fang-x/issues/104)) ([63f79e6](https://github.com/flohulo/fang-x/commit/63f79e6c775750e524d86c11907bb26324b7476f))
* websocket-verbindungen von fremden seiten ablehnen ([#92](https://github.com/flohulo/fang-x/issues/92)) ([01190d9](https://github.com/flohulo/fang-x/commit/01190d9b73dc03a2f7ab363b07c9ae2d6a09ae27))


### Performance Improvements

* natives rate-limiting von workers statt globalem durable object ([#101](https://github.com/flohulo/fang-x/issues/101)) ([256acca](https://github.com/flohulo/fang-x/commit/256accad3633980cd982dc3f311823ca6b0ee8f6))

## [0.11.0](https://github.com/flohulo/fang-x/compare/fang-x-v0.10.0...fang-x-v0.11.0) (2026-11-15)


### Features

* einladungslinks in der installierten pwa öffnen ([#94](https://github.com/flohulo/fang-x/issues/94)) ([1d7b107](https://github.com/flohulo/fang-x/commit/1d7b10731eca39322adf67f7a10f24c879c64a21))
* popup und benachrichtigung bei neuen chatnachrichten ([#82](https://github.com/flohulo/fang-x/issues/82)) ([fb10f3a](https://github.com/flohulo/fang-x/commit/fb10f3a443116a66ce72a194272902aa952eaf07))
* spam-schutz mit menschen-prüfung und verbindungstrennung ([#69](https://github.com/flohulo/fang-x/issues/69)) ([bbfdc4b](https://github.com/flohulo/fang-x/commit/bbfdc4b8d954045a906b0108e381c71448dd53b3))
* sprachauswahl als ersten schritt der einführung ([#84](https://github.com/flohulo/fang-x/issues/84)) ([de3eaf6](https://github.com/flohulo/fang-x/commit/de3eaf6d38c55b639a92dce1989c63d0eb723276))
* sprechfunk für detektive per webrtc ergänzen ([#68](https://github.com/flohulo/fang-x/issues/68)) ([c6a271b](https://github.com/flohulo/fang-x/commit/c6a271b2d8de7526c21995c26d424e0fb5c9c33e))

## [0.10.0](https://github.com/flohulo/fang-x/compare/fang-x-v0.9.0...fang-x-v0.10.0) (2026-11-12)


### Features

* alle-sicher-abfrage und funkstille-warnung ergänzen ([#72](https://github.com/flohulo/fang-x/issues/72)) ([332b2ff](https://github.com/flohulo/fang-x/commit/332b2ffcc5ccb70f09de9127c1c45e17605486ce))
* changelog nach app-update automatisch öffnen ([#80](https://github.com/flohulo/fang-x/issues/80)) ([1437437](https://github.com/flohulo/fang-x/commit/1437437c69ece544bfb5901d48788dea89d63d2f))
* checkliste und warnungen vor dem spiel ([#70](https://github.com/flohulo/fang-x/issues/70)) ([0b61154](https://github.com/flohulo/fang-x/commit/0b6115459e0dce3267272cb4a00a7e8020fcde28))
* team-markierungen für detektive ergänzen ([#75](https://github.com/flohulo/fang-x/issues/75)) ([c8b454e](https://github.com/flohulo/fang-x/commit/c8b454e2f12fb029a1297a5895fcf132ad6a1d48))

## [0.9.0](https://github.com/flohulo/fang-x/compare/fang-x-v0.8.0...fang-x-v0.9.0) (2026-11-10)


### Features

* akku-warnung an alle spielenden senden ([#74](https://github.com/flohulo/fang-x/issues/74)) ([55e4fb4](https://github.com/flohulo/fang-x/commit/55e4fb435ec55d86ca507fcc915c46c162d33320))
* auswertung am spielende anzeigen ([#71](https://github.com/flohulo/fang-x/issues/71)) ([0aea121](https://github.com/flohulo/fang-x/commit/0aea1213e19d61c0ecbac0c4fd46858f7da3c2d2))
* fehlerberichte über glitchtip ergänzen ([#78](https://github.com/flohulo/fang-x/issues/78)) ([d7ef4b4](https://github.com/flohulo/fang-x/commit/d7ef4b4086c3dd5c9c002852e09bff3015099f58))
* qr-code für den beitritt in der lobby anzeigen ([#77](https://github.com/flohulo/fang-x/issues/77)) ([a40cdc3](https://github.com/flohulo/fang-x/commit/a40cdc3c4d8610f1df572e19cd65f095fb92534b))
* spielfeld auf der karte einzeichnen ([#66](https://github.com/flohulo/fang-x/issues/66)) ([f8ebe5d](https://github.com/flohulo/fang-x/commit/f8ebe5d23c581889b461095c2a549681f54b1193))
* webseite für das spiel ergänzen ([#73](https://github.com/flohulo/fang-x/issues/73)) ([fa1c0e2](https://github.com/flohulo/fang-x/commit/fa1c0e2a8c80e0632edeb5aa8460d373121f68f5))
* webseite im app-menü verlinken ([#79](https://github.com/flohulo/fang-x/issues/79)) ([fe00357](https://github.com/flohulo/fang-x/commit/fe00357619e3c1efdb9271613b74abb6361a4fd2))

## [0.8.0](https://github.com/flohulo/fang-x/compare/fang-x-v0.7.2...fang-x-v0.8.0) (2026-11-09)


### Features

* handbuch umbenennen und mitarbeiter-seite aus github ergänzen ([#64](https://github.com/flohulo/fang-x/issues/64)) ([ef16c98](https://github.com/flohulo/fang-x/commit/ef16c986abb5cd74bf9055e8a23998e63ee98910))
* standort im countdown und ping-verlauf für x anzeigen ([#61](https://github.com/flohulo/fang-x/issues/61)) ([8148b3c](https://github.com/flohulo/fang-x/commit/8148b3c5ffeac3a5603055f6af2c8d41fb6d3c75))
* verlassen von lobby und laufender runde bestätigen lassen ([#63](https://github.com/flohulo/fang-x/issues/63)) ([94151c5](https://github.com/flohulo/fang-x/commit/94151c5b761cbba3a2407ae29dc13e3ac0bd32f7))

## [0.7.2](https://github.com/flohulo/fang-x/compare/fang-x-v0.7.1...fang-x-v0.7.2) (2026-11-04)


### Languages

* schweizerdeutsche übersetzung vervollständigen ([#58](https://github.com/flohulo/fang-x/issues/58)) ([46ec9f5](https://github.com/flohulo/fang-x/commit/46ec9f590e3cb2c1ac963537e5e402dde6da460a))

## [0.7.1](https://github.com/flohulo/fang-x/compare/fang-x-v0.7.0...fang-x-v0.7.1) (2026-11-04)


### Bug Fixes

* leere schweizerdeutsch-texte auf deutsch zurückfallen lassen ([#56](https://github.com/flohulo/fang-x/issues/56)) ([ab82cfd](https://github.com/flohulo/fang-x/commit/ab82cfd4296f4ab9dc4ee406c9be5937181785ab))

## [0.7.0](https://github.com/flohulo/fang-x/compare/fang-x-v0.6.0...fang-x-v0.7.0) (2026-11-01)


### Features

* einführung beim ersten start mit berechtigungen und pwa-installation ([#51](https://github.com/flohulo/fang-x/issues/51)) ([a2c5de4](https://github.com/flohulo/fang-x/commit/a2c5de4037f3645f6d939e8ce74fac198989a5d4))
* menülinks auf unterseiten verteilen ([#52](https://github.com/flohulo/fang-x/issues/52)) ([8e8cdcd](https://github.com/flohulo/fang-x/commit/8e8cdcd6173607bcdfea589f717b4b1dcfe3105b))


### Bug Fixes

* fehlende übersetzungen auf deutsch zurückfallen lassen ([#55](https://github.com/flohulo/fang-x/issues/55)) ([57b7173](https://github.com/flohulo/fang-x/commit/57b7173d146e71b3480671cf4fa9e4a0a194fe61))
* schweizerdeutsch im sprachwähler auswählbar machen ([#54](https://github.com/flohulo/fang-x/issues/54)) ([15024ea](https://github.com/flohulo/fang-x/commit/15024ea3373dd80fef7c56cbc299b0446cdcb5d5))

## [0.6.0](https://github.com/flohulo/fang-x/compare/fang-x-v0.5.0...fang-x-v0.6.0) (2026-10-31)


### Features

* alarm-hinweis im menü bei aktivem alarm verkleinern ([#50](https://github.com/flohulo/fang-x/issues/50)) ([3a13000](https://github.com/flohulo/fang-x/commit/3a130004256714fb7e41d0e21b5f1d1c0c5a1c7a))
* mehrsprachigkeit mit i18next und weblate (de/en) ([#33](https://github.com/flohulo/fang-x/issues/33)) ([3f57565](https://github.com/flohulo/fang-x/commit/3f57565d799aeefaa701a8715e88fcc370a960ab))
* sprachupdates im release-changelog ausweisen ([#47](https://github.com/flohulo/fang-x/issues/47)) ([cdbedda](https://github.com/flohulo/fang-x/commit/cdbeddac8255718fb5e7eaf64631a77c220c6cee))
* update-prüfung beim öffnen mit installieren-dialog ([#32](https://github.com/flohulo/fang-x/issues/32)) ([bbd12d3](https://github.com/flohulo/fang-x/commit/bbd12d320275cc91dd5967233c6b92779ffea56d))


### Bug Fixes

* reconnect-token, nachrichtenlimits, wirksame gebiets- und fangregeln; biome entfernt ([#30](https://github.com/flohulo/fang-x/issues/30)) ([9194c72](https://github.com/flohulo/fang-x/commit/9194c724d18fc25390aa03526b323f37c78abc17))

## [0.5.0](https://github.com/flohulo/fang-x/compare/fang-x-v0.4.0...fang-x-v0.5.0) (2026-10-30)


### Features

* diverse hinweisfelder ([#24](https://github.com/flohulo/fang-x/issues/24)) ([28d9472](https://github.com/flohulo/fang-x/commit/28d9472d67f655fd0f04fa0d1d077d0db392734e))
* neue map mit satelliten, öv, chat, weitere einstellungen, aufgeben button, neues wiki ([#27](https://github.com/flohulo/fang-x/issues/27)) ([b6a5dcc](https://github.com/flohulo/fang-x/commit/b6a5dcc13b275a6b2706e154b65396c674b0a508))
* notification ([#26](https://github.com/flohulo/fang-x/issues/26)) ([9e6c988](https://github.com/flohulo/fang-x/commit/9e6c988c6084c51da99da028ac4958fdafd6a910))

## [0.4.0](https://github.com/flohulo/fang-x/compare/fang-x-v0.3.0...fang-x-v0.4.0) (2026-10-22)

### Features

- parameter-label hilfe ([#18](https://github.com/flohulo/fang-x/issues/18)) ([497d9bc](https://github.com/flohulo/fang-x/commit/497d9bc4a60261125c4efa571f5f3a431555e24d))


### Bug Fixes

- Aktualisieren von .release-please-config.json ([248ef4c](https://github.com/flohulo/fang-x/commit/248ef4c2e1539a3754ad25dda16c3c4c7f45176a))
- map zoom ([#21](https://github.com/flohulo/fang-x/issues/21)) ([13c8e9c](https://github.com/flohulo/fang-x/commit/13c8e9c3066a8759dab2d02b47fcf186f827e63a))
- release ([#22](https://github.com/flohulo/fang-x/issues/22)) ([1cea21b](https://github.com/flohulo/fang-x/commit/1cea21b4e7f9e62eb87e7104f31090c24f5c636f))
- update ([979af5c](https://github.com/flohulo/fang-x/commit/979af5c9d64c3f4b2a965a863d897fc22cb1df42))
- workflows, legal and changelog-page ([#17](https://github.com/flohulo/fang-x/issues/17)) ([a3c3312](https://github.com/flohulo/fang-x/commit/a3c33125fdc520ffffff91fa1c6787b31b695659))

## [0.2.0](https://github.com/flohulo/fang-x/compare/fang-x-v0.1.1...fang-x-v0.2.0) (2026-10-21)

### Features

- parameter-label hilfe ([#18](https://github.com/flohulo/fang-x/issues/18)) ([497d9bc](https://github.com/flohulo/fang-x/commit/497d9bc4a60261125c4efa571f5f3a431555e24d))


### Bug Fixes

- workflows, legal and changelog-page ([#17](https://github.com/flohulo/fang-x/issues/17)) ([a3c3312](https://github.com/flohulo/fang-x/commit/a3c33125fdc520ffffff91fa1c6787b31b695659))

## [0.1.1](https://github.com/flohulo/fang-x/compare/fang-x-v0.1.0...fang-x-v0.1.1) (2026-10-20)

### Bug Fixes

- Aktualisieren von .release-please-config.json ([248ef4c](https://github.com/flohulo/fang-x/commit/248ef4c2e1539a3754ad25dda16c3c4c7f45176a))
- update ([979af5c](https://github.com/flohulo/fang-x/commit/979af5c9d64c3f4b2a965a863d897fc22cb1df42))
