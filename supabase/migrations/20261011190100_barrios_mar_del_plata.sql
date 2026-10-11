-- LAB-11 · Barrios del Partido de General Pueyrredon con su centro.
-- Son datos de referencia que necesita TODO entorno (dev, preview y producción), por eso van
-- en una migración y no en seed.sql (que solo corre en local y dev).
-- Fuente: barrios oficiales (OSM boundary=administrative, admin_level=9) más los nombres
-- populares pedidos en LAB-11 que no son barrios oficiales (Plaza Mitre, Stella Maris, Varese,
-- Chauvín, Bosque Peralta Ramos, Camet, Sierra de los Padres). Detalle en scripts/barrios.ts.
-- Para agregar o corregir barrios: migración nueva, sin cambiar ids existentes.
-- Generado con scripts/barrios.ts (2026-10-11). Datos © OpenStreetMap (ODbL).
insert into public.barrios (id, nombre, slug, centro) values
  (1, '9 de Julio', '9-de-julio', 'SRID=4326;POINT(-57.58532 -37.97286)'), -- OSM r5830565
  (2, 'Aeroparque', 'aeroparque', 'SRID=4326;POINT(-57.57647 -37.94565)'), -- OSM r5844840
  (3, 'Alfar', 'alfar', 'SRID=4326;POINT(-57.56167 -38.09474)'), -- OSM r5749463
  (4, 'Autódromo', 'autodromo', 'SRID=4326;POINT(-57.63409 -37.99126)'), -- OSM r5827509
  (5, 'Barranca de Los Lobos', 'barranca-de-los-lobos', 'SRID=4326;POINT(-57.63427 -38.15361)'), -- OSM r5813418
  (6, 'Barrio Colinalegre', 'barrio-colinalegre', 'SRID=4326;POINT(-57.68141 -38.01007)'), -- OSM r5833143
  (7, 'Batán', 'batan', 'SRID=4326;POINT(-57.70855 -38.00482)'), -- OSM r5833683
  (8, 'Belisario Roldán', 'belisario-roldan', 'SRID=4326;POINT(-57.60827 -37.98437)'), -- OSM r5830169
  (9, 'Bernardino Rivadavia', 'bernardino-rivadavia', 'SRID=4326;POINT(-57.58537 -37.99862)'), -- OSM r5824510
  (10, 'Bosque Alegre', 'bosque-alegre', 'SRID=4326;POINT(-57.59227 -38.00570)'), -- OSM r5810152
  (11, 'Bosque Grande', 'bosque-grande', 'SRID=4326;POINT(-57.60558 -38.01390)'), -- OSM r5757099
  (12, 'Bosque Peralta Ramos', 'bosque-peralta-ramos', 'SRID=4326;POINT(-57.57190 -38.08790)'), -- OSM place=suburb n8529109122
  (13, 'Caisamar y Estrada', 'caisamar-y-estrada', 'SRID=4326;POINT(-57.56384 -37.95364)'), -- OSM r5839618
  (14, 'Camet', 'camet', 'SRID=4326;POINT(-57.52770 -37.90180)'), -- OSM place=neighbourhood n2428071824
  (15, 'Camino a Necochea', 'camino-a-necochea', 'SRID=4326;POINT(-57.62489 -38.01077)'), -- OSM r5827201
  (16, 'Caribe', 'caribe', 'SRID=4326;POINT(-57.61997 -37.97949)'), -- OSM r5830264
  (17, 'Centro', 'centro', 'SRID=4326;POINT(-57.54959 -38.00319)'), -- OSM r5836418
  (18, 'Cerrito Sur', 'cerrito-sur', 'SRID=4326;POINT(-57.57710 -38.04843)'), -- OSM r5756813
  (19, 'Cerrito y San Salvador', 'cerrito-y-san-salvador', 'SRID=4326;POINT(-57.56930 -38.04126)'), -- OSM r5756841
  (20, 'Chauvín', 'chauvin', 'SRID=4326;POINT(-57.55210 -38.01430)'), -- OSM place=suburb n3516403320
  (21, 'Colinas de Peralta Ramos', 'colinas-de-peralta-ramos', 'SRID=4326;POINT(-57.55888 -38.05666)'), -- OSM r5753150
  (22, 'Constitución', 'constitucion', 'SRID=4326;POINT(-57.54778 -37.96218)'), -- OSM r5839412
  (23, 'Coronel Dorrego', 'coronel-dorrego', 'SRID=4326;POINT(-57.60179 -37.97620)'), -- OSM r5830177
  (24, 'Divino Rostro', 'divino-rostro', 'SRID=4326;POINT(-57.55063 -38.02060)'), -- OSM r5824422
  (25, 'Don Bosco', 'don-bosco', 'SRID=4326;POINT(-57.57274 -37.99132)'), -- OSM r5836478
  (26, 'Don Emilio', 'don-emilio', 'SRID=4326;POINT(-57.61420 -38.00348)'), -- OSM r5827227
  (27, 'El Colmenar', 'el-colmenar', 'SRID=4326;POINT(-57.69304 -38.00003)'), -- OSM r5833314
  (28, 'El Gaucho', 'el-gaucho', 'SRID=4326;POINT(-57.60051 -38.00493)'), -- OSM r5810159
  (29, 'El Jardín de Peralta Ramos', 'el-jardin-de-peralta-ramos', 'SRID=4326;POINT(-57.56855 -38.07042)'), -- OSM r5749522
  (30, 'El Jardín de Stella Maris', 'el-jardin-de-stella-maris', 'SRID=4326;POINT(-57.57078 -38.06519)'), -- OSM r5753143
  (31, 'El Martillo', 'el-martillo', 'SRID=4326;POINT(-57.59710 -38.03351)'), -- OSM r5742262
  (32, 'El Progreso', 'el-progreso', 'SRID=4326;POINT(-57.57857 -38.03430)'), -- OSM r5756844
  (33, 'Estación Norte', 'estacion-norte', 'SRID=4326;POINT(-57.56545 -37.98545)'), -- OSM r5836600
  (34, 'Faro Norte', 'faro-norte', 'SRID=4326;POINT(-57.55146 -38.08273)'), -- OSM r5749517
  (35, 'Florencio Sánchez', 'florencio-sanchez', 'SRID=4326;POINT(-57.58957 -38.03904)'), -- OSM r5742265
  (36, 'Florentino Ameghino', 'florentino-ameghino', 'SRID=4326;POINT(-57.62131 -37.95684)'), -- OSM r5830456
  (37, 'Fortunato de la Plaza', 'fortunato-de-la-plaza', 'SRID=4326;POINT(-57.59237 -38.02389)'), -- OSM r5757095
  (38, 'Funes y San Lorenzo', 'funes-y-san-lorenzo', 'SRID=4326;POINT(-57.57385 -38.00817)'), -- OSM r5824489
  (39, 'General Belgrano', 'general-belgrano', 'SRID=4326;POINT(-57.62560 -37.99724)'), -- OSM r5827482
  (40, 'General Pueyrredón', 'general-pueyrredon', 'SRID=4326;POINT(-57.60478 -38.02726)'), -- OSM r5742249
  (41, 'General Roca', 'general-roca', 'SRID=4326;POINT(-57.55191 -38.01436)'), -- OSM r5824434
  (42, 'General San Martín', 'general-san-martin', 'SRID=4326;POINT(-57.58330 -38.04378)'), -- OSM r5743243
  (43, 'Highland Park', 'highland-park', 'SRID=4326;POINT(-57.67917 -38.18554)'), -- OSM r5813491
  (44, 'Hipódromo', 'hipodromo', 'SRID=4326;POINT(-57.65211 -37.96075)'), -- OSM r5830342
  (45, 'Jorge Newbery', 'jorge-newbery', 'SRID=4326;POINT(-57.61510 -37.97168)'), -- OSM r5830269
  (46, 'José Hernández', 'jose-hernandez', 'SRID=4326;POINT(-57.61785 -37.99091)'), -- OSM r5827496
  (47, 'Juramento', 'juramento', 'SRID=4326;POINT(-57.57021 -38.05359)'), -- OSM r5753155
  (48, 'La Arboleda', 'la-arboleda', 'SRID=4326;POINT(-57.62896 -38.15016)'), -- OSM r5813423
  (49, 'La Florida', 'la-florida', 'SRID=4326;POINT(-57.58663 -37.94342)'), -- OSM r5830609
  (50, 'La Herradura', 'la-herradura', 'SRID=4326;POINT(-57.64271 -37.95255)'), -- OSM r5830452
  (51, 'La Perla', 'la-perla', 'SRID=4326;POINT(-57.54785 -37.99014)'), -- OSM r5836581
  (52, 'Las Alamedas', 'las-alamedas', 'SRID=4326;POINT(-57.71660 -38.01051)'), -- OSM r5833727
  (53, 'Las Américas', 'las-americas', 'SRID=4326;POINT(-57.60612 -37.99782)'), -- OSM r5827481
  (54, 'Las Avenidas', 'las-avenidas', 'SRID=4326;POINT(-57.56507 -38.03137)'), -- OSM r5791764
  (55, 'Las Canteras', 'las-canteras', 'SRID=4326;POINT(-57.60589 -38.04910)'), -- OSM r5733513
  (56, 'Las Heras', 'las-heras', 'SRID=4326;POINT(-57.61485 -38.02109)'), -- OSM r5738056
  (57, 'Las Lilas', 'las-lilas', 'SRID=4326;POINT(-57.59512 -37.98523)'), -- OSM r5827551
  (58, 'Las Lomas', 'las-lomas', 'SRID=4326;POINT(-57.72601 -38.00499)'), -- OSM r5833733
  (59, 'Leandro N. Alem', 'leandro-n-alem', 'SRID=4326;POINT(-57.53296 -38.02598)'), -- OSM r5836743
  (60, 'Libertad', 'libertad', 'SRID=4326;POINT(-57.60473 -37.95884)'), -- OSM r5830502
  (61, 'Lomas de Stella Maris', 'lomas-de-stella-maris', 'SRID=4326;POINT(-57.53378 -38.01620)'), -- OSM r5836372
  (62, 'López de Gomara', 'lopez-de-gomara', 'SRID=4326;POINT(-57.58221 -37.95994)'), -- OSM r5830607
  (63, 'Los Acantilados', 'los-acantilados', 'SRID=4326;POINT(-57.60454 -38.11200)'), -- OSM r5743370
  (64, 'Los Andes', 'los-andes', 'SRID=4326;POINT(-57.58307 -37.98668)'), -- OSM r5836484
  (65, 'Los Pinares', 'los-pinares', 'SRID=4326;POINT(-57.57027 -37.96227)'), -- OSM r5839405
  (66, 'Los Tilos', 'los-tilos', 'SRID=4326;POINT(-57.59228 -37.94946)'), -- OSM r5830479
  (67, 'Los Troncos', 'los-troncos', 'SRID=4326;POINT(-57.53997 -38.01997)'), -- OSM r5824415
  (68, 'Malvinas Argentinas', 'malvinas-argentinas', 'SRID=4326;POINT(-57.59197 -37.96416)'), -- OSM r5830575
  (69, 'Nuevo Golf', 'nuevo-golf', 'SRID=4326;POINT(-57.58478 -38.06157)'), -- OSM r5813235
  (70, 'Parque Hermoso', 'parque-hermoso', 'SRID=4326;POINT(-57.64420 -38.04186)'), -- OSM r5735849
  (71, 'Parque Independencia', 'parque-independencia', 'SRID=4326;POINT(-57.57634 -38.06716)'), -- OSM r5753144
  (72, 'Parque Luro', 'parque-luro', 'SRID=4326;POINT(-57.55244 -37.97198)'), -- OSM r5836750
  (73, 'Parque Montemar - El Grosellar', 'parque-montemar-el-grosellar', 'SRID=4326;POINT(-57.55946 -37.94606)'), -- OSM r5844846
  (74, 'Parque Palermo', 'parque-palermo', 'SRID=4326;POINT(-57.63072 -38.02145)'), -- OSM r5738052
  (75, 'Peralta Ramos Oeste', 'peralta-ramos-oeste', 'SRID=4326;POINT(-57.57749 -38.02218)'), -- OSM r5810055
  (76, 'Pinos de Anchorena', 'pinos-de-anchorena', 'SRID=4326;POINT(-57.57600 -38.00387)'), -- OSM r5824496
  (77, 'Playa Chapadmalal', 'playa-chapadmalal', 'SRID=4326;POINT(-57.65200 -38.17367)'), -- OSM r5813457
  (78, 'Playa Grande', 'playa-grande', 'SRID=4326;POINT(-57.54131 -38.02474)'), -- OSM r5824407
  (79, 'Playa Serena', 'playa-serena', 'SRID=4326;POINT(-57.58460 -38.10260)'), -- OSM r5749377
  (80, 'Plaza Mitre', 'plaza-mitre', 'SRID=4326;POINT(-57.55280 -38.00330)'), -- OSM leisure=park Plaza Mitre
  (81, 'Plaza Peralta Ramos', 'plaza-peralta-ramos', 'SRID=4326;POINT(-57.56280 -38.00158)'), -- OSM r5836427
  (82, 'Primera Junta', 'primera-junta', 'SRID=4326;POINT(-57.55934 -38.02015)'), -- OSM r5824430
  (83, 'Puerto', 'puerto', 'SRID=4326;POINT(-57.54938 -38.04246)'), -- OSM r5781852
  (84, 'Punta Mogotes', 'punta-mogotes', 'SRID=4326;POINT(-57.55113 -38.06785)'), -- OSM r5753147
  (85, 'Quebradas de Peralta Ramos', 'quebradas-de-peralta-ramos', 'SRID=4326;POINT(-57.60039 -38.06949)'), -- OSM r5818815
  (86, 'Regional', 'regional', 'SRID=4326;POINT(-57.60008 -37.99189)'), -- OSM r5827540
  (87, 'San Antonio', 'san-antonio', 'SRID=4326;POINT(-57.59710 -38.01026)'), -- OSM r5810122
  (88, 'San Carlos', 'san-carlos', 'SRID=4326;POINT(-57.54922 -38.02941)'), -- OSM r5824371
  (89, 'San Cayetano', 'san-cayetano', 'SRID=4326;POINT(-57.59061 -37.97958)'), -- OSM r5827554
  (90, 'San Eduardo de Chapadmalal', 'san-eduardo-de-chapadmalal', 'SRID=4326;POINT(-57.71099 -38.20045)'), -- OSM r5813534
  (91, 'San Eduardo del Mar', 'san-eduardo-del-mar', 'SRID=4326;POINT(-57.76254 -38.22758)'), -- OSM r5813277
  (92, 'San Jacinto', 'san-jacinto', 'SRID=4326;POINT(-57.57848 -38.09890)'), -- OSM r5749378
  (93, 'San Jorge', 'san-jorge', 'SRID=4326;POINT(-57.63499 -37.95763)'), -- OSM r5830364
  (94, 'San José', 'san-jose', 'SRID=4326;POINT(-57.56615 -38.01294)'), -- OSM r5824474
  (95, 'San Juan', 'san-juan', 'SRID=4326;POINT(-57.56133 -37.99439)'), -- OSM r5836465
  (96, 'San Patricio', 'san-patricio', 'SRID=4326;POINT(-57.59031 -38.10611)'), -- OSM r5749367
  (97, 'Santa Celina', 'santa-celina', 'SRID=4326;POINT(-57.59330 -38.04961)'), -- OSM r5735982
  (98, 'Santa Isabel', 'santa-isabel', 'SRID=4326;POINT(-57.68837 -38.19582)'), -- OSM r5813529
  (99, 'Santa Mónica', 'santa-monica', 'SRID=4326;POINT(-57.58371 -38.01080)'), -- OSM r5818969
  (100, 'Santa Rita', 'santa-rita', 'SRID=4326;POINT(-57.59061 -38.01530)'), -- OSM r5810072
  (101, 'Santa Rosa de Lima', 'santa-rosa-de-lima', 'SRID=4326;POINT(-57.63148 -37.96756)'), -- OSM r5830271
  (102, 'Santa Rosa del Mar de Peralta Ramos', 'santa-rosa-del-mar-de-peralta-ramos', 'SRID=4326;POINT(-57.60994 -38.08130)'), -- OSM r5818787
  (103, 'Sarmiento', 'sarmiento', 'SRID=4326;POINT(-57.57547 -37.98036)'), -- OSM r5836603
  (104, 'Sierra de los Padres', 'sierra-de-los-padres', 'SRID=4326;POINT(-57.77560 -37.94130)'), -- OSM boundary Sierra de los Padres
  (105, 'Stella Maris', 'stella-maris', 'SRID=4326;POINT(-57.53590 -38.01220)'), -- OSM, iglesia Stella Maris
  (106, 'Termas Huincó', 'termas-huinco', 'SRID=4326;POINT(-57.56199 -38.04679)'), -- OSM r5753158
  (107, 'Varese', 'varese', 'SRID=4326;POINT(-57.53200 -38.01400)'), -- OSM, Playa Varese
  (108, 'Vieja Terminal', 'vieja-terminal', 'SRID=4326;POINT(-57.54522 -38.01217)'), -- OSM r5836407
  (109, 'Villa Lourdes', 'villa-lourdes', 'SRID=4326;POINT(-57.55671 -38.04036)'), -- OSM r5781866
  (110, 'Villa Primera', 'villa-primera', 'SRID=4326;POINT(-57.56608 -37.97584)'), -- OSM r5836606
  (111, 'Villa Serrana', 'villa-serrana', 'SRID=4326;POINT(-57.71931 -37.99597)'), -- OSM r5833484
  (112, 'Virgen de Luján', 'virgen-de-lujan', 'SRID=4326;POINT(-57.60517 -37.94538)'), -- OSM r5830478
  (113, 'Zacagnini', 'zacagnini', 'SRID=4326;POINT(-57.54319 -37.95099)'); -- OSM r5844915
