# Připravené akceptační scénáře

Tyto soubory jsou návrh testů modulů, které zatím nejsou implementované. Nejsou součástí běžného npm test a nejsou započítané do počtu prošlých testů. Ověřena je pouze syntaxe přes node --check.

Po dodání odpovídajícího kolektoru/běhu přesunout soubor do nadřazené složky tests, přejmenovat na *.test.mjs, změnit relativní import ../../tools na ../tools a skutečně spustit. Teprve po review a průchodu testů označit funkci za implementovanou. Fake Storage SDK a remote adapter neprokazují živé oprávnění, cloudovou kopii nebo běžící plánovač.
