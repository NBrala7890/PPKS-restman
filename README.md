# PPKS-restman
Web aplikacija za praćenje narudžbi za dostavu u restoranu
Web aplikacija omogućuje restoranima da u stvarnom vremenu upravljaju narudžbama.
Korisnik unosi svoju narudžbu putem REST API-ja, a kuhinja uživo preko WebSocketa vidi nove narudžbe.
Kada je narudžba gotova, kuhinja šalje obavijest dostavljačima.
Korisnici mogu pratiti status svoje narudžbe putem REST API-ja.
Web aplikacija koristi WebSocket komunikaciju, relacijsku bazu podataka za pohranu i RESTful API za pristup podacima.