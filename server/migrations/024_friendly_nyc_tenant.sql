-- Friendly Party Rental NYC as a fully isolated RentSketch tenant.
-- Safe to re-run: the API applies every migration on every deploy.
-- The 198 approved non-package NYC items are seeded from the 2026-09-30 owner-approved snapshot.
-- NYC prices are the storefront's clean whole-dollar prices; Syracuse prices are never copied.
BEGIN;

INSERT INTO tenants (
  slug,name,legal_name,contact_email,phone,website,primary_color,secondary_color,tagline,show_prices,
  subscription_plan,subscription_status,trial_ends_at,embed_key,allowed_origins,powered_by_enabled,
  customer_access,pass_price_cents,pass_duration_days,active_order_grace_days,credit_pass_to_order
) VALUES (
  'friendly-nyc','Friendly Party Rental NYC','Friendly Party Rental L.L.C.','customerservice@friendlypartyrental.com',
  '315-884-1498','https://friendlypartyrentalnyc.com','#0B1F3A','#E07B00',
  'Plan your Riverdale and Downstate New York event with Friendly Party Rental NYC',true,
  'commerce','active',NULL,encode(gen_random_bytes(16),'hex'),
  '["https://friendlypartyrentalnyc.com","https://www.friendlypartyrentalnyc.com","https://nyc.friendlypartyrental.com"]'::jsonb,
  true,'free',NULL,30,7,false
)
ON CONFLICT (slug) DO UPDATE SET
  name=EXCLUDED.name,legal_name=EXCLUDED.legal_name,contact_email=EXCLUDED.contact_email,phone=EXCLUDED.phone,
  website=EXCLUDED.website,primary_color=EXCLUDED.primary_color,secondary_color=EXCLUDED.secondary_color,
  tagline=EXCLUDED.tagline,show_prices=true,subscription_plan='commerce',subscription_status='active',
  allowed_origins=EXCLUDED.allowed_origins,powered_by_enabled=true,customer_access='free',pass_price_cents=NULL,
  pass_duration_days=30,active_order_grace_days=7,credit_pass_to_order=false,updated_at=now();

CREATE TEMP TABLE friendly_nyc_approved_catalog (
  external_id text PRIMARY KEY,
  name text NOT NULL,
  price numeric NOT NULL,
  fallback_category text NOT NULL,
  photo_url text,
  sort_order integer NOT NULL
) ON COMMIT DROP;

INSERT INTO friendly_nyc_approved_catalog(external_id,name,price,fallback_category,photo_url,sort_order) VALUES
  ('fpr:10-12-oz-water-goblet','10 1/2 oz. Water Goblet',3,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/10-12-oz-water-goblet',1),
  ('fpr:10-58-dinner-plate','10-5/8 Dinner Plate',3,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/10-58-dinner-plate',2),
  ('fpr:10-gallon-insulated-beverage-dispenser','10 Gallon Insulated Beverage Dispenser',60,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/10-gallon-insulated-beverage-dispenser',3),
  ('fpr:10-inch-cake-plate','10-Inch Cake Plate',2,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/10-inch-cake-plate',4),
  ('fpr:10-x-10-ez-pop-up-canopy-tent','10 x 10 EZ Pop Up Canopy Tent',170,'tent','https://friendlypartyrentalnyc.com/api/item-image/10-x-10-ez-pop-up-canopy-tent',5),
  ('fpr:10-x-20-ez-pop-up-canopy-tent','10 x 20 EZ Pop Up Canopy Tent',300,'tent','https://friendlypartyrentalnyc.com/api/item-image/10-x-20-ez-pop-up-canopy-tent',6),
  ('fpr:100-lb-propane-tank','100 lb. Propane Tank',170,'other','https://friendlypartyrentalnyc.com/api/item-image/100-lb-propane-tank',7),
  ('fpr:108-round-polyester-tablecloth','108 Round Polyester Tablecloth',31,'linen','https://friendlypartyrentalnyc.com/api/item-image/108-round-polyester-tablecloth',8),
  ('fpr:10x10-pop-up-sidewall','10x10 Pop-Up Sidewall',34,'tent','https://friendlypartyrentalnyc.com/api/item-image/10x10-pop-up-sidewall',9),
  ('fpr:11-qt-round-soup-chafer','11 Qt Round Soup Chafer',68,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/11-qt-round-soup-chafer',10),
  ('fpr:120-inch-round-polyester-tablecloth','120 inch Round Polyester Tablecloth',34,'linen','https://friendlypartyrentalnyc.com/api/item-image/120-inch-round-polyester-tablecloth',11),
  ('fpr:120-quart-hard-ice-chest-cooler','120-Quart Hard Ice Chest Cooler',43,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/120-quart-hard-ice-chest-cooler',12),
  ('fpr:120-round-satin-tablecloth','120 Round Satin Tablecloth',38,'linen','https://friendlypartyrentalnyc.com/api/item-image/120-round-satin-tablecloth',13),
  ('fpr:120in-round-sequin-tablecloth-rose-gold','120 Round Sequin Tablecloth',38,'linen','https://friendlypartyrentalnyc.com/api/item-image/120in-round-sequin-tablecloth-rose-gold',14),
  ('fpr:132-round-polyester-tablecloth','132 Round Polyester Tablecloth',41,'linen','https://friendlypartyrentalnyc.com/api/item-image/132-round-polyester-tablecloth',15),
  ('fpr:170k-btu-tent-heater','170K BTU Tent Heater',215,'other','https://friendlypartyrentalnyc.com/api/item-image/170k-btu-tent-heater',16),
  ('fpr:18ft-purple-tropical-marble-double-bay-waterslide','18ft Purple Tropical Marble Double Bay Waterslide',680,'inflatable','https://friendlypartyrentalnyc.com/api/item-image/18ft-purple-tropical-marble-double-bay-waterslide',17),
  ('fpr:20-inch-fan','20-Inch Fan',34,'other','https://friendlypartyrentalnyc.com/api/item-image/20-inch-fan',18),
  ('fpr:20-lb-propane-tank','20 lb. Propane Tank',43,'other','https://friendlypartyrentalnyc.com/api/item-image/20-lb-propane-tank',19),
  ('fpr:20-side-wall-tent','20'' Side Wall Tent',68,'tent','https://friendlypartyrentalnyc.com/api/item-image/20-side-wall-tent',20),
  ('fpr:20-side-wall-with-windows','20'' Side Wall with Windows',85,'tent','https://friendlypartyrentalnyc.com/api/item-image/20-side-wall-with-windows',21),
  ('fpr:20-x-20-frame-tent','20 x 20 Frame Tent',680,'tent','https://friendlypartyrentalnyc.com/api/item-image/20-x-20-frame-tent',22),
  ('fpr:20-x-30-frame-tent','20 x 30 Frame Tent',810,'tent','https://friendlypartyrentalnyc.com/api/item-image/20-x-30-frame-tent',23),
  ('fpr:20-x-40-frame-tent','20 x 40 Frame Tent',935,'tent','https://friendlypartyrentalnyc.com/api/item-image/20-x-40-frame-tent',24),
  ('fpr:20x20-pole-tent','20x20 Pole Tent',425,'tent','https://friendlypartyrentalnyc.com/api/item-image/20x20-pole-tent',25),
  ('fpr:20x30-pole-tent','20x30 Pole Tent',595,'tent','https://friendlypartyrentalnyc.com/api/item-image/20x30-pole-tent',26),
  ('fpr:20x40-pole-tent','20x40 Pole Tent',765,'tent','https://friendlypartyrentalnyc.com/api/item-image/20x40-pole-tent',27),
  ('fpr:22ft-tropical-lava-wave-marble-waterslide','22ft Tropical Lava Wave Marble Waterslide',850,'inflatable','https://friendlypartyrentalnyc.com/api/item-image/22ft-tropical-lava-wave-marble-waterslide',28),
  ('fpr:25-foot-movie-screen-with-projector','25-Foot Movie Screen with Projector',340,'inflatable','https://friendlypartyrentalnyc.com/api/item-image/25-foot-movie-screen-with-projector',29),
  ('fpr:25-gallon-insulated-beverage-dispenser','2.5 Gallon Insulated Beverage Dispenser',43,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/25-gallon-insulated-beverage-dispenser',30),
  ('fpr:30-x-30-pole-tent','30 x 30 Pole Tent',980,'tent','https://friendlypartyrentalnyc.com/api/item-image/30-x-30-pole-tent',31),
  ('fpr:30-x-45-pole-tent','30 x 45 Pole Tent',1190,'tent','https://friendlypartyrentalnyc.com/api/item-image/30-x-45-pole-tent',32),
  ('fpr:30-x-60-pole-tent','30 x 60 Pole Tent',1445,'tent','https://friendlypartyrentalnyc.com/api/item-image/30-x-60-pole-tent',33),
  ('fpr:30a-power-distribution-spider-box','30A Power Distribution Spider Box',42,'generator','https://friendlypartyrentalnyc.com/api/item-image/30a-power-distribution-spider-box',34),
  ('fpr:30x40-classic-frame-tent','30x40 Classic Frame Tent',1190,'tent','https://friendlypartyrentalnyc.com/api/item-image/30x40-classic-frame-tent',35),
  ('fpr:32-gallon-trash-can','32 Gallon Trash Can',51,'other','https://friendlypartyrentalnyc.com/api/item-image/32-gallon-trash-can',36),
  ('fpr:4-qt-round-chafer','4 Qt Round Chafer',51,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/4-qt-round-chafer',37),
  ('fpr:40-x-100-pole-tent','40 x 100 Pole Tent',3315,'tent','https://friendlypartyrentalnyc.com/api/item-image/40-x-100-pole-tent',38),
  ('fpr:40-x-40-pole-tent','40 x 40 Pole Tent',2550,'tent','https://friendlypartyrentalnyc.com/api/item-image/40-x-40-pole-tent',39),
  ('fpr:40-x-80-pole-tent','40 x 80 Pole Tent',3145,'tent','https://friendlypartyrentalnyc.com/api/item-image/40-x-80-pole-tent',40),
  ('fpr:40x60-pole-tent','40x60 Pole Tent',2720,'tent','https://friendlypartyrentalnyc.com/api/item-image/40x60-pole-tent',41),
  ('fpr:4375-watt-generator','4375-Watt Generator',215,'generator','https://friendlypartyrentalnyc.com/api/item-image/4375-watt-generator',42),
  ('fpr:45-oz-champagne-flute','4.5 oz Champagne Flute',3,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/45-oz-champagne-flute',43),
  ('fpr:4ft-fill-and-chill-table','4ft Fill and Chill Table',68,'table','https://friendlypartyrentalnyc.com/api/item-image/4ft-fill-and-chill-table',44),
  ('fpr:5-oz-footed-rocks-glass','5 oz Footed Rocks Glass',3,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/5-oz-footed-rocks-glass',45),
  ('fpr:54x120-banquet-polyester-tablecloth','54x120 Banquet Polyester Tablecloth',27,'linen','https://friendlypartyrentalnyc.com/api/item-image/54x120-banquet-polyester-tablecloth',46),
  ('fpr:55-oz-popcorn-kernel','5.5 oz Popcorn Kernel',9,'concession','https://friendlypartyrentalnyc.com/api/item-image/55-oz-popcorn-kernel',47),
  ('fpr:550w-bluetooth-speaker','550W Bluetooth Speaker',130,'other','https://friendlypartyrentalnyc.com/api/item-image/550w-bluetooth-speaker',48),
  ('fpr:5ft-round-table','5ft Round Table',26,'table','https://friendlypartyrentalnyc.com/api/item-image/5ft-round-table',49),
  ('fpr:5ft-tumbling-timbers','5ft Tumbling Timbers',43,'game','https://friendlypartyrentalnyc.com/api/item-image/5ft-tumbling-timbers',50),
  ('fpr:6-inch-bread-and-butter-plate','6-Inch Bread and Butter Plate',3,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/6-inch-bread-and-butter-plate',51),
  ('fpr:60-oz-beverage-pitcher','60 oz Beverage Pitcher',17,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/60-oz-beverage-pitcher',52),
  ('fpr:65-qt-round-top-chafer','6.5 Qt Round Top Chafer',43,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/65-qt-round-top-chafer',53),
  ('fpr:6ft-plastic-folding-table','6ft Plastic Folding Table',22,'table','https://friendlypartyrentalnyc.com/api/item-image/6ft-plastic-folding-table',54),
  ('fpr:7-inch-salad-plate','7-Inch Salad Plate',3,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/7-inch-salad-plate',55),
  ('fpr:72-x-120-banquet-tablecloth','72 x 120 Banquet Tablecloth',31,'linen','https://friendlypartyrentalnyc.com/api/item-image/72-x-120-banquet-tablecloth',56),
  ('fpr:725-oz-martini-glass','7.25 oz Martini Glass',3,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/725-oz-martini-glass',57),
  ('fpr:8-quart-full-size-chafer','8-Quart Full-Size Chafer',51,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/8-quart-full-size-chafer',58),
  ('fpr:80k-btu-tent-heater','80K BTU Tent Heater',170,'other','https://friendlypartyrentalnyc.com/api/item-image/80k-btu-tent-heater',59),
  ('fpr:85-inch-rim-soup-bowl','8.5-Inch Rim Soup Bowl',4,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/85-inch-rim-soup-bowl',60),
  ('fpr:85-oz-wine-glass','8.5 oz Wine Glass',3,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/85-oz-wine-glass',61),
  ('fpr:8ft-banquet-table','8ft Banquet Table',24,'table','https://friendlypartyrentalnyc.com/api/item-image/8ft-banquet-table',62),
  ('fpr:8ft-x-31in-stage-skirt','8ft x 31in Stage Skirt',43,'dance_floor','https://friendlypartyrentalnyc.com/api/item-image/8ft-x-31in-stage-skirt',63),
  ('fpr:90-round-polyester-tablecloth','90 Round Polyester Tablecloth',29,'linen','https://friendlypartyrentalnyc.com/api/item-image/90-round-polyester-tablecloth',64),
  ('fpr:90x132-banquet-polyester-tablecloth','90x132 Banquet Polyester Tablecloth',41,'linen','https://friendlypartyrentalnyc.com/api/item-image/90x132-banquet-polyester-tablecloth',65),
  ('fpr:90x156-banquet-polyester-tablecloth','90x156 Banquet Polyester Tablecloth',44,'linen','https://friendlypartyrentalnyc.com/api/item-image/90x156-banquet-polyester-tablecloth',66),
  ('fpr:9ft-table-runner','9ft Table Runner',7,'linen','https://friendlypartyrentalnyc.com/api/item-image/9ft-table-runner',67),
  ('fpr:audio-guest-book','Audio Guest Book',340,'wedding','https://friendlypartyrentalnyc.com/api/item-image/audio-guest-book',68),
  ('fpr:battery-operated-crystal-chandelier','Battery-Operated Crystal Chandelier',170,'lighting','https://friendlypartyrentalnyc.com/api/item-image/battery-operated-crystal-chandelier',69),
  ('fpr:bistro-lighting-20x20','Bistro Lighting (20x20)',215,'lighting','https://friendlypartyrentalnyc.com/api/item-image/bistro-lighting-20x20',70),
  ('fpr:black-spandex-6ft-table-linen','Spandex 6ft Table Linen',31,'linen','https://friendlypartyrentalnyc.com/api/item-image/black-spandex-6ft-table-linen',71),
  ('fpr:black-spandex-8ft-table-linen','Black Spandex 8ft Table Linen',34,'linen','https://friendlypartyrentalnyc.com/api/item-image/black-spandex-8ft-table-linen',72),
  ('fpr:bus-bin','Bus Bin',9,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/bus-bin',73),
  ('fpr:cake-fork','Cake Fork',3,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/cake-fork',74),
  ('fpr:chess-set','Chess Set',43,'game','https://friendlypartyrentalnyc.com/api/item-image/chess-set',75),
  ('fpr:chocolate-fountain','Chocolate Fountain',130,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/chocolate-fountain',76),
  ('fpr:cocktail-table','Cocktail Table',20,'table','https://friendlypartyrentalnyc.com/api/item-image/cocktail-table',77),
  ('fpr:cocktail-table-cover-white','Cocktail Table Cover',20,'linen','https://friendlypartyrentalnyc.com/api/item-image/cocktail-table-cover-white',78),
  ('fpr:coffee-urn-percolator','Coffee Urn / Percolator',60,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/coffee-urn-percolator',79),
  ('fpr:cornhole','Cornhole',68,'game','https://friendlypartyrentalnyc.com/api/item-image/cornhole',80),
  ('fpr:cotton-candy-floss-sugar-blue-raspberry','Cotton Candy Floss Sugar - Blue Raspberry',17,'concession','https://friendlypartyrentalnyc.com/api/item-image/cotton-candy-floss-sugar-blue-raspberry',81),
  ('fpr:cotton-candy-floss-sugar-grape','Cotton Candy Floss Sugar - Grape',17,'concession','https://friendlypartyrentalnyc.com/api/item-image/cotton-candy-floss-sugar-grape',82),
  ('fpr:cotton-candy-floss-sugar-lemon','Cotton Candy Floss Sugar - Lemon',17,'concession','https://friendlypartyrentalnyc.com/api/item-image/cotton-candy-floss-sugar-lemon',83),
  ('fpr:cotton-candy-floss-sugar-pink','Cotton Candy Floss Sugar - Pink',17,'concession','https://friendlypartyrentalnyc.com/api/item-image/cotton-candy-floss-sugar-pink',84),
  ('fpr:cotton-candy-machinefloss-maker','Cotton Candy Machine/Floss Maker',170,'concession','https://friendlypartyrentalnyc.com/api/item-image/cotton-candy-machinefloss-maker',85),
  ('fpr:crayon-bounce-house','Rainbow Castle Bounce House',340,'inflatable','https://friendlypartyrentalnyc.com/api/item-image/crayon-bounce-house',86),
  ('fpr:cross-back-farmhouse-chair','Cross-Back Farmhouse Chair',24,'wedding','https://friendlypartyrentalnyc.com/api/item-image/cross-back-farmhouse-chair',87),
  ('fpr:crowd-control-stanchion','Crowd Control Stanchion',26,'other','https://friendlypartyrentalnyc.com/api/item-image/crowd-control-stanchion',88),
  ('fpr:custom-lighting-300ft','Custom Lighting - 300ft',340,'lighting','https://friendlypartyrentalnyc.com/api/item-image/custom-lighting-300ft',89),
  ('fpr:dance-floor-3x3-section','Dance Floor 3x3 Section',60,'dance_floor','https://friendlypartyrentalnyc.com/api/item-image/dance-floor-3x3-section',90),
  ('fpr:dinner-fork','Dinner Fork',3,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/dinner-fork',91),
  ('fpr:dinner-knife','Dinner Knife',3,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/dinner-knife',92),
  ('fpr:extra-movie-night-speaker','Extra Movie Night Speaker',94,'inflatable','https://friendlypartyrentalnyc.com/api/item-image/extra-movie-night-speaker',93),
  ('fpr:fire-red-marble-inflatable-water-slide','Fire Red Marble Inflatable Water Slide',510,'inflatable','https://friendlypartyrentalnyc.com/api/item-image/fire-red-marble-inflatable-water-slide',94),
  ('fpr:fire-truck-water-slide-bounce-house','Fire Truck Water Slide Bounce House',595,'inflatable','https://friendlypartyrentalnyc.com/api/item-image/fire-truck-water-slide-bounce-house',95),
  ('fpr:foam-party-machine','Foam Party Machine',470,'other','https://friendlypartyrentalnyc.com/api/item-image/foam-party-machine',96),
  ('fpr:freezer-chest','Freezer Chest',85,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/freezer-chest',97),
  ('fpr:giant-uno-cards','Giant Uno Cards',34,'game','https://friendlypartyrentalnyc.com/api/item-image/giant-uno-cards',98),
  ('fpr:glass-beaded-charger-plate','Glass Beaded Charger Plate',4,'wedding','https://friendlypartyrentalnyc.com/api/item-image/glass-beaded-charger-plate',99),
  ('fpr:glass-carafe','Glass Carafe',7,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/glass-carafe',100),
  ('fpr:glass-coffee-mug','Glass Coffee Mug',4,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/glass-coffee-mug',101),
  ('fpr:glass-water-pitcher-64-oz','Glass Water Pitcher (64 oz)',17,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/glass-water-pitcher-64-oz',102),
  ('fpr:gold-5-arm-candelabra','Gold 5-Arm Candelabra',34,'wedding','https://friendlypartyrentalnyc.com/api/item-image/gold-5-arm-candelabra',103),
  ('fpr:gold-beaded-charger-plate','Gold Beaded Charger Plate',4,'wedding','https://friendlypartyrentalnyc.com/api/item-image/gold-beaded-charger-plate',104),
  ('fpr:gold-card-box','Gold Card Box',26,'wedding','https://friendlypartyrentalnyc.com/api/item-image/gold-card-box',105),
  ('fpr:gold-chiavari-chair','Gold Chiavari Chair',20,'chair','https://friendlypartyrentalnyc.com/api/item-image/gold-chiavari-chair',106),
  ('fpr:gold-mirror-welcome-sign','Gold Mirror Welcome Sign',60,'wedding','https://friendlypartyrentalnyc.com/api/item-image/gold-mirror-welcome-sign',107),
  ('fpr:gold-pedestal-cake-stand-14in','Gold Pedestal Cake Stand (14in)',26,'wedding','https://friendlypartyrentalnyc.com/api/item-image/gold-pedestal-cake-stand-14in',108),
  ('fpr:gold-welcome-sign-easel','Gold Welcome Sign Easel',43,'wedding','https://friendlypartyrentalnyc.com/api/item-image/gold-welcome-sign-easel',109),
  ('fpr:greenery-and-floral-wall-8x8','Greenery and Floral Wall (8x8)',255,'wedding','https://friendlypartyrentalnyc.com/api/item-image/greenery-and-floral-wall-8x8',110),
  ('fpr:handwashing-station','Handwashing Station',340,'other','https://friendlypartyrentalnyc.com/api/item-image/handwashing-station',111),
  ('fpr:hexagon-wedding-arch','Hexagon Wedding Arch',130,'wedding','https://friendlypartyrentalnyc.com/api/item-image/hexagon-wedding-arch',112),
  ('fpr:hot-dog-bun-warmer','Hot Dog Bun Warmer',51,'concession','https://friendlypartyrentalnyc.com/api/item-image/hot-dog-bun-warmer',113),
  ('fpr:hot-dog-roller-grill','Hot Dog Roller Grill',160,'concession','https://friendlypartyrentalnyc.com/api/item-image/hot-dog-roller-grill',114),
  ('fpr:inflatable-basketball-game','Inflatable Basketball Game',170,'inflatable','https://friendlypartyrentalnyc.com/api/item-image/inflatable-basketball-game',115),
  ('fpr:keg-coolertub','Keg Cooler/Tub',34,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/keg-coolertub',116),
  ('fpr:king-throne-chair','King Throne Chair',204,'chair','https://friendlypartyrentalnyc.com/api/item-image/king-throne-chair',117),
  ('fpr:ladderball','Ladderball',68,'game','https://friendlypartyrentalnyc.com/api/item-image/ladderball',118),
  ('fpr:large-connect-four','Large Connect Four',51,'game','https://friendlypartyrentalnyc.com/api/item-image/large-connect-four',119),
  ('fpr:large-family-style-serving-bowl','Plastic Round Catering / Serving Bowl',4,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/large-family-style-serving-bowl',120),
  ('fpr:leg-drape','Leg Drape',43,'tent','https://friendlypartyrentalnyc.com/api/item-image/leg-drape',121),
  ('fpr:madison-arbor','Madison Arbor',130,'wedding','https://friendlypartyrentalnyc.com/api/item-image/madison-arbor',122),
  ('fpr:mahogany-chiavari-chair','Mahogany Chiavari Chair',20,'chair','https://friendlypartyrentalnyc.com/api/item-image/mahogany-chiavari-chair',123),
  ('fpr:matching-napkins','Matching Napkins',4,'linen','https://friendlypartyrentalnyc.com/api/item-image/matching-napkins',124),
  ('fpr:movie-night-laptop-rental','Movie Night Laptop Rental',130,'inflatable','https://friendlypartyrentalnyc.com/api/item-image/movie-night-laptop-rental',125),
  ('fpr:nacho-cheese-warmer','Nacho Cheese Warmer',68,'concession','https://friendlypartyrentalnyc.com/api/item-image/nacho-cheese-warmer',126),
  ('fpr:patriotic-red-white-and-blue-bounce-house','Patriotic Red, White and Blue Bounce House',425,'inflatable','https://friendlypartyrentalnyc.com/api/item-image/patriotic-red-white-and-blue-bounce-house',127),
  ('fpr:photobooth-3-hour-with-attendant','Photobooth (3-Hour) With Attendant',930,'photobooth','https://friendlypartyrentalnyc.com/api/item-image/photobooth-3-hour-with-attendant',128),
  ('fpr:photobooth-4-hour-no-attendant','Photobooth (4-Hour) No Attendant',640,'photobooth','https://friendlypartyrentalnyc.com/api/item-image/photobooth-4-hour-no-attendant',129),
  ('fpr:photobooth-4-hour-with-attendant','Photobooth (4-Hour) With Attendant',1100,'photobooth','https://friendlypartyrentalnyc.com/api/item-image/photobooth-4-hour-with-attendant',130),
  ('fpr:photobooth-4x6-print-upgrade','Photobooth 4x6 Print Upgrade',170,'photobooth','https://friendlypartyrentalnyc.com/api/item-image/photobooth-4x6-print-upgrade',131),
  ('fpr:photobooth-6-hour-no-attendant','Photobooth (6-Hour) No Attendant',810,'photobooth','https://friendlypartyrentalnyc.com/api/item-image/photobooth-6-hour-no-attendant',132),
  ('fpr:photobooth-6-hour-with-attendant','Photobooth (6-Hour) With Attendant',1350,'photobooth','https://friendlypartyrentalnyc.com/api/item-image/photobooth-6-hour-with-attendant',133),
  ('fpr:photobooth-8-hour-no-attendant','Photobooth (8-Hour) No Attendant',980,'photobooth','https://friendlypartyrentalnyc.com/api/item-image/photobooth-8-hour-no-attendant',134),
  ('fpr:photobooth-8-hour-with-attendant','Photobooth (8-Hour) With Attendant',1625,'photobooth','https://friendlypartyrentalnyc.com/api/item-image/photobooth-8-hour-with-attendant',135),
  ('fpr:photobooth-custom-backdrop-upgrade','Photobooth Custom Backdrop Upgrade',145,'photobooth','https://friendlypartyrentalnyc.com/api/item-image/photobooth-custom-backdrop-upgrade',136),
  ('fpr:photobooth-extra-hour-attended','Photobooth Extra Hour (Attended)',170,'photobooth','https://friendlypartyrentalnyc.com/api/item-image/photobooth-extra-hour-attended',137),
  ('fpr:piecake-server','Pie/Cake Server',4,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/piecake-server',138),
  ('fpr:pilsner-beer-glass','Pilsner Beer Glass',4,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/pilsner-beer-glass',139),
  ('fpr:pink-inflatable-bounce-house','Pink Inflatable Bounce House',340,'inflatable','https://friendlypartyrentalnyc.com/api/item-image/pink-inflatable-bounce-house',140),
  ('fpr:pirate-ship-slide-combo-bounce-house','Pirate Ship Slide Combo Bounce House',680,'inflatable','https://friendlypartyrentalnyc.com/api/item-image/pirate-ship-slide-combo-bounce-house',141),
  ('fpr:plastic-linen-clips','Plastic Linen Clips (12 Pack)',7,'linen','https://friendlypartyrentalnyc.com/api/item-image/plastic-linen-clips',142),
  ('fpr:podium-and-microphone','Podium and Microphone',170,'other','https://friendlypartyrentalnyc.com/api/item-image/podium-and-microphone',143),
  ('fpr:pong-game','Pong Game',43,'game','https://friendlypartyrentalnyc.com/api/item-image/pong-game',144),
  ('fpr:popcorn-machine','Popcorn Machine',130,'concession','https://friendlypartyrentalnyc.com/api/item-image/popcorn-machine',145),
  ('fpr:pretzel-display-warmer','Pretzel Display Warmer',130,'concession','https://friendlypartyrentalnyc.com/api/item-image/pretzel-display-warmer',146),
  ('fpr:propane-heater','Propane Heater',136,'other','https://friendlypartyrentalnyc.com/api/item-image/propane-heater',147),
  ('fpr:queen-tiffany-throne-chair','Queen Tiffany Throne Chair',215,'chair','https://friendlypartyrentalnyc.com/api/item-image/queen-tiffany-throne-chair',148),
  ('fpr:red-carpet','Red Carpet',130,'other','https://friendlypartyrentalnyc.com/api/item-image/red-carpet',149),
  ('fpr:roll-top-8-qt-chafer','Roll-Top 8 Qt Chafer',77,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/roll-top-8-qt-chafer',150),
  ('fpr:round-gold-metal-display-dish','Round Gold Metal Display Dish',17,'wedding','https://friendlypartyrentalnyc.com/api/item-image/round-gold-metal-display-dish',151),
  ('fpr:round-wedding-arch-7ft','Round Wedding Arch (7ft)',130,'wedding','https://friendlypartyrentalnyc.com/api/item-image/round-wedding-arch-7ft',152),
  ('fpr:rustic-lantern-table-centerpiece','Rustic Lantern Table Centerpiece',43,'table','https://friendlypartyrentalnyc.com/api/item-image/rustic-lantern-table-centerpiece',153),
  ('fpr:salad-fork','Salad Fork',3,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/salad-fork',154),
  ('fpr:salt-and-pepper-shaker-set','Salt and Pepper Shaker Set',6,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/salt-and-pepper-shaker-set',155),
  ('fpr:sequin-backdrop-panel-8x8','Sequin Backdrop Panel (8x8)',170,'wedding','https://friendlypartyrentalnyc.com/api/item-image/sequin-backdrop-panel-8x8',156),
  ('fpr:serving-spoon','Serving Spoon',6,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/serving-spoon',157),
  ('fpr:serving-tongs','Serving Tongs',4,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/serving-tongs',158),
  ('fpr:sheet-pan','Sheet Pan',13,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/sheet-pan',159),
  ('fpr:snow-cone-machine','Snow Cone Machine',94,'concession','https://friendlypartyrentalnyc.com/api/item-image/snow-cone-machine',160),
  ('fpr:snow-cone-syrup-blue-raspberry','Snow Cone Syrup - Blue Raspberry',14,'concession','https://friendlypartyrentalnyc.com/api/item-image/snow-cone-syrup-blue-raspberry',161),
  ('fpr:snow-cone-syrup-cherry','Snow Cone Syrup - Cherry',14,'concession','https://friendlypartyrentalnyc.com/api/item-image/snow-cone-syrup-cherry',162),
  ('fpr:snow-cone-syrup-orange','Snow Cone Syrup - Orange',14,'concession','https://friendlypartyrentalnyc.com/api/item-image/snow-cone-syrup-orange',163),
  ('fpr:snow-cone-syrup-pina-colada','Snow Cone Syrup - Pina Colada',14,'concession','https://friendlypartyrentalnyc.com/api/item-image/snow-cone-syrup-pina-colada',164),
  ('fpr:spandex-chair-cover','Spandex Chair Cover',4,'linen','https://friendlypartyrentalnyc.com/api/item-image/spandex-chair-cover',165),
  ('fpr:stage-ramp','Stage Ramp',85,'dance_floor','https://friendlypartyrentalnyc.com/api/item-image/stage-ramp',166),
  ('fpr:stage-section','Stage Section',215,'dance_floor','https://friendlypartyrentalnyc.com/api/item-image/stage-section',167),
  ('fpr:stage-stair','Stage Stair',94,'dance_floor','https://friendlypartyrentalnyc.com/api/item-image/stage-stair',168),
  ('fpr:standard-portable-restroom','Standard Portable Restroom',510,'other','https://friendlypartyrentalnyc.com/api/item-image/standard-portable-restroom',169),
  ('fpr:sterno-fuel-cans-pack-of-2','Sterno Fuel Cans (Pack of 2)',9,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/sterno-fuel-cans-pack-of-2',170),
  ('fpr:sugar-and-creamer-set','Sugar and Creamer Set',9,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/sugar-and-creamer-set',171),
  ('fpr:sweetheart-table-60in-half-round','Sweetheart Table (60in Half-Round)',60,'wedding','https://friendlypartyrentalnyc.com/api/item-image/sweetheart-table-60in-half-round',172),
  ('fpr:table-number-stands','Table Number Stands',4,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/table-number-stands',173),
  ('fpr:tablespoon-soup-spoon','Tablespoon / Soup Spoon',3,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/tablespoon-soup-spoon',174),
  ('fpr:tall-highball-glass','Tall Highball Glass',3,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/tall-highball-glass',175),
  ('fpr:teaspoon','Teaspoon',3,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/teaspoon',176),
  ('fpr:tent-lighting-20x20','Tent Lighting (20x20)',170,'lighting','https://friendlypartyrentalnyc.com/api/item-image/tent-lighting-20x20',177),
  ('fpr:tent-lighting-20x30','Tent Lighting - 20x30',215,'lighting','https://friendlypartyrentalnyc.com/api/item-image/tent-lighting-20x30',178),
  ('fpr:tent-lighting-20x40','Tent Lighting (20x40)',255,'lighting','https://friendlypartyrentalnyc.com/api/item-image/tent-lighting-20x40',179),
  ('fpr:tent-lighting-30x30','Tent Lighting - 30x30',215,'lighting','https://friendlypartyrentalnyc.com/api/item-image/tent-lighting-30x30',180),
  ('fpr:tent-lighting-30x45','Tent Lighting - 30x45',300,'lighting','https://friendlypartyrentalnyc.com/api/item-image/tent-lighting-30x45',181),
  ('fpr:tent-lighting-30x60','Tent Lighting - 30x60',340,'lighting','https://friendlypartyrentalnyc.com/api/item-image/tent-lighting-30x60',182),
  ('fpr:tent-lighting-40x100','Tent Lighting - 40x100',595,'lighting','https://friendlypartyrentalnyc.com/api/item-image/tent-lighting-40x100',183),
  ('fpr:tent-lighting-40x40','Tent Lighting - 40x40',385,'lighting','https://friendlypartyrentalnyc.com/api/item-image/tent-lighting-40x40',184),
  ('fpr:tent-lighting-40x60','Tent Lighting - 40x60',425,'lighting','https://friendlypartyrentalnyc.com/api/item-image/tent-lighting-40x60',185),
  ('fpr:tent-lighting-40x80','Tent Lighting - 40x80',510,'lighting','https://friendlypartyrentalnyc.com/api/item-image/tent-lighting-40x80',186),
  ('fpr:tent-misting-10x10-pop-up-tent','Tent Misting 10x10 Pop Up Tent',255,'tent','https://friendlypartyrentalnyc.com/api/item-image/tent-misting-10x10-pop-up-tent',187),
  ('fpr:tidal-wave-inflatable-water-slide','Tidal Wave Inflatable Water Slide',425,'inflatable','https://friendlypartyrentalnyc.com/api/item-image/tidal-wave-inflatable-water-slide',188),
  ('fpr:tiered-cake-display-3-level-gold','Tiered Cake Display - 3-Level Gold',43,'wedding','https://friendlypartyrentalnyc.com/api/item-image/tiered-cake-display-3-level-gold',189),
  ('fpr:water-barrel-cover','Water Barrel Cover',34,'tent','https://friendlypartyrentalnyc.com/api/item-image/water-barrel-cover',190),
  ('fpr:wedding-white-bounce-house','Wedding White Bounce House',425,'inflatable','https://friendlypartyrentalnyc.com/api/item-image/wedding-white-bounce-house',191),
  ('fpr:white-aisle-runner-100ft','White Aisle Runner (100ft)',170,'wedding','https://friendlypartyrentalnyc.com/api/item-image/white-aisle-runner-100ft',192),
  ('fpr:white-chiavari-chair','White Chiavari Chair',20,'chair','https://friendlypartyrentalnyc.com/api/item-image/white-chiavari-chair',193),
  ('fpr:white-plastic-folding-chair','White Plastic Folding Chair',5,'chair','https://friendlypartyrentalnyc.com/api/item-image/white-plastic-folding-chair',194),
  ('fpr:white-resin-folding-chair','White Resin Folding Chair',9,'chair','https://friendlypartyrentalnyc.com/api/item-image/white-resin-folding-chair',195),
  ('fpr:white-table-linen-round-60','White Table Linen Round 60"',27,'linen','https://friendlypartyrentalnyc.com/api/item-image/white-table-linen-round-60',196),
  ('fpr:wine-champagne-bucket','Wine / Champagne Bucket',26,'tabletop','https://friendlypartyrentalnyc.com/api/item-image/wine-champagne-bucket',197),
  ('fpr:wireless-led-uplight','Wireless LED Uplight',43,'lighting','https://friendlypartyrentalnyc.com/api/item-image/wireless-led-uplight',198);

WITH target AS (
  SELECT id FROM tenants WHERE slug='friendly-nyc'
), source_tenant AS (
  SELECT id FROM tenants WHERE slug='friendly'
), approved AS (
  SELECT a.*,
    fp.category AS source_category,
    fp.visual_model_id AS source_visual_model_id,
    fp.width_ft AS source_width_ft,
    fp.length_ft AS source_length_ft,
    fp.capacity AS source_capacity
  FROM friendly_nyc_approved_catalog a
  LEFT JOIN source_tenant st ON true
  LEFT JOIN LATERAL (
    SELECT p.category,p.visual_model_id,p.width_ft,p.length_ft,p.capacity
    FROM products p
    WHERE p.tenant_id=st.id AND p.external_id=a.external_id
    ORDER BY p.active DESC,p.updated_at DESC NULLS LAST,p.id
    LIMIT 1
  ) fp ON true
)
INSERT INTO products (
  tenant_id,category,external_id,name,price_per_day,price_type,width_ft,length_ft,capacity,photo_url,visual_model_id,sort_order,active,updated_at
)
SELECT t.id,COALESCE(a.source_category,a.fallback_category),a.external_id,a.name,a.price,'per_day',
  a.source_width_ft,a.source_length_ft,a.source_capacity,a.photo_url,a.source_visual_model_id,a.sort_order,true,now()
FROM approved a CROSS JOIN target t
WHERE NOT EXISTS (
  SELECT 1 FROM products p WHERE p.tenant_id=t.id AND p.external_id=a.external_id
);

WITH target AS (
  SELECT id FROM tenants WHERE slug='friendly-nyc'
), source_tenant AS (
  SELECT id FROM tenants WHERE slug='friendly'
), approved AS (
  SELECT a.*,
    fp.category AS source_category,
    fp.visual_model_id AS source_visual_model_id,
    fp.width_ft AS source_width_ft,
    fp.length_ft AS source_length_ft,
    fp.capacity AS source_capacity
  FROM friendly_nyc_approved_catalog a
  LEFT JOIN source_tenant st ON true
  LEFT JOIN LATERAL (
    SELECT p.category,p.visual_model_id,p.width_ft,p.length_ft,p.capacity
    FROM products p
    WHERE p.tenant_id=st.id AND p.external_id=a.external_id
    ORDER BY p.active DESC,p.updated_at DESC NULLS LAST,p.id
    LIMIT 1
  ) fp ON true
)
UPDATE products p SET
  category=COALESCE(a.source_category,a.fallback_category),
  name=a.name,
  price_per_day=a.price,
  price_type='per_day',
  width_ft=COALESCE(p.width_ft,a.source_width_ft),
  length_ft=COALESCE(p.length_ft,a.source_length_ft),
  capacity=COALESCE(p.capacity,a.source_capacity),
  photo_url=a.photo_url,
  visual_model_id=COALESCE(p.visual_model_id,a.source_visual_model_id),
  sort_order=a.sort_order,
  active=true,
  updated_at=now()
FROM approved a,target t
WHERE p.tenant_id=t.id AND p.external_id=a.external_id;

COMMIT;
