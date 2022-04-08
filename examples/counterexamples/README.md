Every CSDL file in this folder represents a test case where schema validation that is meant to fail at a certain line and column because a certain XML schema rule is violated.

Per CSDL file there must be three entries in the [`test.properties`](test.properties) file:
```
filename.xml.line=<line number>
filename.xml.col=<column number>
filename.xml.rule=<rule name>
```
