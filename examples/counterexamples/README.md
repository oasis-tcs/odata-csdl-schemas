Every CSDL XML file in this folder represents a test case where XML schema validation is meant to fail at a certain line and column because a certain XML schema rule is violated.

Per CSDL file there must be three entries in the [`test.properties`](test.properties) file:
```
filename.xml.line=<line number>
filename.xml.col=<column number>
filename.xml.rule=<rule name>
```
To find out the correct values, first set `<line number> = <column number> = 0` and `<rule name> = dummy` and run `npm test`. It will fail at the wrong place and give you an error like
> filename.xml fails at line 9, column 14, rule cvc-complex-type.2.4.a: ...  
> instead of line 0, column 0, rule dummy