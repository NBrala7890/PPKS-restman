CREATE TABLE meal(
	mealID INT PRIMARY KEY IDENTITY,
	mealName VARCHAR(100) UNIQUE NOT NULL,
	mealDescription VARCHAR(100),
	mealAllergens VARCHAR(100),
	mealCategory VARCHAR(100) NOT NULL,
	mealPreparationTimeMinutes INT NOT NULL,
	price DECIMAL(10,2) NOT NULL
);

drop table meal;
drop table drink;
drop table orderItem;
drop table customerOrder;

INSERT INTO meal (mealName, mealDescription, mealAllergens, mealCategory, mealPreparationTimeMinutes, price)
	VALUES ('margherita', 'Pizza with mozzarela cheese', 'lactose', 'Pizza', 7, 10);

INSERT INTO meal (mealName, mealDescription, mealAllergens, mealCategory, mealPreparationTimeMinutes, price)
	VALUES ('vegetarian', 'Pizza with season vegetables', 'lactose', 'Pizza', 9, 13);

INSERT INTO meal (mealName, mealDescription, mealAllergens, mealCategory, mealPreparationTimeMinutes, price)
	VALUES ('al tonno', 'Pizza with tuna fish and red onion', 'lactose', 'Pizza', 10, 13);

INSERT INTO meal (mealName, mealDescription, mealAllergens, mealCategory, mealPreparationTimeMinutes, price)
	VALUES ('spaghetti bolognese', 'Home-made spaghetti pasta wtih bolognese', NULL, 'Pasta', 6, 7);

INSERT INTO meal (mealName, mealDescription, mealAllergens, mealCategory, mealPreparationTimeMinutes, price)
	VALUES ('tomato soup', 'Creamy tomato soup with basil', 'lactose', 'Soup', 8, 5);

select * from meal;

CREATE TABLE drink(
	drinkID INT PRIMARY KEY IDENTITY,
	drinkName VARCHAR(100) UNIQUE NOT NULL,
	drinkDescription VARCHAR(100),
	drinkCategory VARCHAR(100) NOT NULL,
	drinkVolume VARCHAR(20) NOT NULL,
	isAlcoholicDrink BIT NOT NULL,
	price DECIMAL(10,2) NOT NULL
);

INSERT INTO drink (drinkName, drinkDescription, drinkCategory, drinkVolume, isAlcoholicDrink, price)
	VALUES ('water', 'Natural water', 'Soft drinks (non-carbonated)', '0,25 L', 0, 2);

INSERT INTO drink (drinkName, drinkDescription, drinkCategory, drinkVolume, isAlcoholicDrink, price)
	VALUES ('mineral water', 'Sparkling mineral water', 'Soft drinks (carbonated)', '0,25 L', 0, 2.5);

INSERT INTO drink (drinkName, drinkDescription, drinkCategory, drinkVolume, isAlcoholicDrink, price)
	VALUES ('orange juice', 'Fresh 100% orange juice', 'Soft drinks (non-carbonated)', '0,33 L', 0, 3);

INSERT INTO drink (drinkName, drinkDescription, drinkCategory, drinkVolume, isAlcoholicDrink, price)
	VALUES ('apple juice', 'Fresh apple juice', 'Soft drinks (non-carbonated)', '0,33 L', 0, 3);

INSERT INTO drink (drinkName, drinkDescription, drinkCategory, drinkVolume, isAlcoholicDrink, price)
	VALUES ('coca cola', NULL, 'Soft drinks (carbonated)', '0,25 L', 0, 3.2);

select * from drink;

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
    -- Nemamo direktni foreign key prema meal ili drink jer koristimo itemType za razlikovanje
    CONSTRAINT CHK_ItemType CHECK (itemType IN ('meal', 'drink'))
);

select * from orderItem;

select * from customerOrder;