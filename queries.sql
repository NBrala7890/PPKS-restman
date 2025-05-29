-- SQL Server
CREATE TABLE meal(
	mealID INT PRIMARY KEY IDENTITY,
	mealName VARCHAR(100) UNIQUE NOT NULL,
	mealDescription VARCHAR(100),
	mealAllergens VARCHAR(100),
	mealCategory VARCHAR(100) NOT NULL,
	mealPreparationTimeMinutes INT NOT NULL,
	price DECIMAL(10,2) NOT NULL
);

-- PostgreSQL
CREATE TABLE meal(
	mealID INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	mealName VARCHAR(100) UNIQUE NOT NULL,
	mealDescription VARCHAR(100),
	mealAllergens VARCHAR(100),
	mealCategory VARCHAR(100) NOT NULL,
	mealPreparationTimeMinutes INT NOT NULL,
	price DECIMAL(10,2) NOT NULL
);

-- SQL Server
CREATE TABLE drink(
	drinkID INT PRIMARY KEY IDENTITY,
	drinkName VARCHAR(100) UNIQUE NOT NULL,
	drinkDescription VARCHAR(100),
	drinkCategory VARCHAR(100) NOT NULL,
	drinkVolume VARCHAR(20) NOT NULL,
	isAlcoholicDrink BIT NOT NULL,
	price DECIMAL(10,2) NOT NULL
);

-- PostgreSQL
CREATE TABLE drink(
	drinkID INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	drinkName VARCHAR(100) UNIQUE NOT NULL,
	drinkDescription VARCHAR(100),
	drinkCategory VARCHAR(100) NOT NULL,
	drinkVolume VARCHAR(20) NOT NULL,
	isAlcoholicDrink BOOLEAN NOT NULL,
	price DECIMAL(10,2) NOT NULL
);

-- SQL Server
CREATE TABLE customerOrder (
    customerOrderID INT PRIMARY KEY IDENTITY,
    orderDate DATETIME NOT NULL DEFAULT GETDATE(),
    customerName VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, completed, cancelled
	orderPreparationTimeMinutes INT NOT NULL,
	totalItems INT NOT NULL,
	totalDistinctItems INT NOT NULL,
    totalAmount DECIMAL(10,2) NOT NULL DEFAULT 0,
    notes VARCHAR(255)
);

-- PostgreSQL
CREATE TABLE customerOrder (
    customerOrderID INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    orderDate TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    customerName VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- SQLINES DEMO *** d, cancelled
	orderPreparationTimeMinutes INT NOT NULL,
	totalItems INT NOT NULL,
	totalDistinctItems INT NOT NULL,
    totalAmount DECIMAL(10,2) NOT NULL DEFAULT 0,
    notes VARCHAR(255)
);

-- SQL Server
CREATE TABLE orderItem (
    orderItemID INT PRIMARY KEY IDENTITY,
    customerOrderID INT NOT NULL,
    itemType VARCHAR(10) NOT NULL, -- 'meal' ili 'drink'
    itemID INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unitPrice DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    notes VARCHAR(255),
    FOREIGN KEY (customerOrderID) REFERENCES customerOrder(customerOrderID),
    CONSTRAINT CHK_ItemType CHECK (itemType IN ('meal', 'drink'))
);

-- PostgreSQL
CREATE TABLE orderItem (
    orderItemID INT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    customerOrderID INT NOT NULL,
    itemType VARCHAR(10) NOT NULL, -- 'm... SQLINES DEMO ***
    itemID INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unitPrice DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    notes VARCHAR(255),
    FOREIGN KEY (customerOrderID) REFERENCES customerOrder(customerOrderID),
    CONSTRAINT CHK_ItemType CHECK (itemType IN ('meal', 'drink'))
);

select * from meal;
select * from drink;
select * from orderItem;
select * from customerOrder;

drop table meal;
drop table drink;
drop table orderItem;
drop table customerOrder;

-- Unos jela
INSERT INTO meal (mealName, mealDescription, mealAllergens, mealCategory, mealPreparationTimeMinutes, price) VALUES
('Pizza Margherita', 'Klasična pizza s rajčicom, mozzarellom i bosiljkom', 'mlijeko, gluten', 'Pizza', 10, 7.50),
('Cheeseburger', 'Sočni burger s cheddar sirom, salatom, rajčicom i umakom', 'mlijeko, gluten, jaja', 'Burger', 7, 8.00),
('Gulaš', 'Tradicionalno jelo od govedine u bogatom umaku', '', 'Glavno jelo', 20, 10.00),
('Špageti Carbonara', 'Tjestenina s pancetom, jajima i sirom', 'jaja, mlijeko, gluten', 'Tjestenina', 6, 9.00),
('Cezar salata', 'Salata s piletinom, parmezanom i Cezar umakom', 'mlijeko, gluten, riba, jaja', 'Salata', 5, 7.00),
('Riblji file', 'File bijele ribe na žaru s povrćem', 'riba', 'Glavno jelo', 12, 12.00),
('Sarma', 'Kiseli kupus punjen mljevenim mesom i rižom', '', 'Glavno jelo', 20, 11.00),
('Rižoto s plodovima mora', 'Kremasti rižoto s lignjama, školjkama i škampima', 'mekušci, rakovi', 'Rižoto', 15, 13.00),
('Bečki odrezak', 'Pohani teleći odrezak s prilogom', 'gluten, jaja', 'Glavno jelo', 17, 14.00),
('Palačinke s nutellom', 'Tanko tijesto punjeno nutellom', 'mlijeko, gluten, orašasti plodovi', 'Desert', 5, 4.50),
('Tortilja s piletinom', 'Piletina, povrće i umak u tortilji', 'mlijeko, gluten', 'Predjelo', 12, 6.00),
('Minestrone juha', 'Gusta povrtna juha s tjesteninom', 'gluten', 'Juha', 20, 5.00),
('Musaka', 'Jelo slojevito pripremljeno s krumpirom, mesom i bešamel umakom', 'mlijeko, gluten', 'Glavno jelo', 20, 9.50),
('Pljeskavica', 'Mljeveno meso oblikovano u pljeskavicu s prilozima', '', 'Glavno jelo', 10, 7.00),
('Punjena paprika', 'Paprike punjene mljevenim mesom i rižom u umaku od rajčice', '', 'Glavno jelo', 15, 10.50),
('Bruskete', 'Kriške kruha s rajčicama, bosiljkom i maslinovim uljem', 'gluten', 'Predjelo', 3, 4.00),
('Lasagne', 'Slojevito jelo s mesom, rajčicom i bešamel umakom', 'mlijeko, gluten', 'Tjestenina', 10, 11.00),
('Caprese salata', 'Rajčice, mozzarella i svježi bosiljak s maslinovim uljem', 'mlijeko', 'Salata', 5, 6.50),
('Šopska salata', 'Miješana salata s feta sirom', 'mlijeko', 'Salata', 5, 5.50),
('Tiramisu', 'Talijanski desert s piškotama, kavom i mascarpone sirom', 'mlijeko, jaja, gluten', 'Desert', 5, 5.50);

-- Unos pića
INSERT INTO drink (drinkName, drinkDescription, drinkCategory, drinkVolume, isAlcoholicDrink, price) VALUES
('Voda', 'Prirodna izvorska voda', 'Bezalkoholno', '0.5 L', FALSE, 2.00),
('Coca-Cola', 'Gazirano bezalkoholno piće', 'Bezalkoholno', '0.33 L', FALSE, 3.00),
('Pivo', 'Lager pivo, svijetlo i osvježavajuće', 'Alkoholno', '0.5 L', TRUE, 4.00),
('Crno vino', 'Suho crno vino, bogatog okusa', 'Alkoholno', '0.1 L', TRUE, 6.00),
('Bijelo vino', 'Lagano suho bijelo vino', 'Alkoholno', '0.1 L', TRUE, 6.00),
('Aperol Spritz', 'Osvježavajući koktel s Aperolom i pjenušcem', 'Koktel', '0.33 L', TRUE, 8.00),
('Espresso', 'Jaka talijanska kava', 'Kava', '0.03 L', FALSE, 2.50),
('Cappuccino', 'Espresso s mlijekom i pjenom', 'Kava', '0.1 L', FALSE, 3.50),
('Latte Macchiato', 'Espresso s puno mlijeka i pjene', 'Kava', '0.2 L', FALSE, 4.00),
('Čaj od mente', 'Osvježavajući biljni čaj', 'Topli napitak', '0.25 L', FALSE, 2.50),
('Vruća čokolada', 'Gusti čokoladni napitak', 'Topli napitak', '0.2 L', FALSE, 4.00),
('Sok od naranče', 'Svježe cijeđeni sok od naranče', 'Bezalkoholno', '0.25 L', FALSE, 3.50),
('Mojito', 'Osvježavajući koktel s rumom, limetom i mentom', 'Koktel', '0.33 L', TRUE, 7.00),
('Gin Tonic', 'Koktel s ginom i tonikom', 'Koktel', '0.33 L', TRUE, 8.00),
('Smoothie od jagode', 'Miješano voće s jogurtom', 'Bezalkoholno', '0.33 L', FALSE, 5.00),
('Whiskey', 'Viski s bogatom aromom', 'Alkoholno', '0.05 L', TRUE, 5.00),
('Radler', 'Mješavina piva i limunade', 'Alkoholno', '0.5 L', TRUE, 4.50),
('Martini', 'Aperitiv s aromom bilja', 'Alkoholno', '0.1 L', TRUE, 6.00),
('Limunada', 'Svježe cijeđena limunada', 'Bezalkoholno', '0.33 L', FALSE, 3.00),
('Mineralna voda', 'Gazirana izvorska voda', 'Bezalkoholno', '0.75 L', FALSE, 2.50);