import javax.xml.transform.stream.StreamSource;
import javax.xml.validation.SchemaFactory;
import javax.xml.validation.TypeInfoProvider;
import javax.xml.parsers.SAXParserFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.XMLConstants;
import java.io.File;
import java.io.FileInputStream;
import java.io.FilenameFilter;
import java.io.IOException;
import java.util.Properties;
import org.xml.sax.helpers.DefaultHandler;
import org.xml.sax.Attributes;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;
import org.xml.sax.SAXParseException;
import org.xml.sax.helpers.XMLReaderFactory;

class XMLFiles implements FilenameFilter {
	public boolean accept(File dir, String name) {
		return name.endsWith(".xml");
	}
}

class ABNFoutput extends DefaultHandler {
	private TypeInfoProvider type;
	ABNFoutput(TypeInfoProvider type) {
		super();
		this.type = type;
	}
	public void startElement(String uri, String localName, String qName, Attributes attributes) throws SAXException {
		for (int i = 0; i < attributes.getLength(); i++) {
			var typeinfo = this.type.getAttributeTypeInfo(i);
			if (typeinfo.getTypeNamespace() == "http://docs.oasis-open.org/odata/ns/edm")
				switch (typeinfo.getTypeName()) {
				case "TSimpleIdentifier": System.out.println("- odataIdentifier: " + attributes.getValue(i)); break;
				case "TNamespaceName": System.out.println("- namespace: " + attributes.getValue(i)); break;
				case "TPath": System.out.println("- propertyPath: " + attributes.getValue(i)); break;
				case "TInstancePath": System.out.println("- commonExpr: " + attributes.getValue(i)); break;
				case "TModelPath": System.out.println("- modelPath: " + attributes.getValue(i)); break;
				case "TTarget": System.out.println("- annotationTarget: " + attributes.getValue(i)); break;
				}
		}
	}
}

public class Validator {
	public static void main(String[] args) throws IOException, SAXException, ParserConfigurationException {
		var schemaFactory = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
		var validator = schemaFactory.newSchema(new File("schemas/edmx.xsd")).newValidatorHandler();
		validator.setContentHandler(new ABNFoutput(validator.getTypeInfoProvider()));
		var reader = XMLReaderFactory.createXMLReader();
		reader.setContentHandler(validator);
		for (var file : new File("examples").listFiles(new XMLFiles())) {
			System.out.println("# " + file.getName());
			reader.parse(new InputSource(new FileInputStream(file)));
		}
		var test = new Properties();
		test.load(new FileInputStream("examples/counterexamples/test.properties"));
		var negativeValidator = schemaFactory.newSchema(new File("schemas/edmx.xsd")).newValidator();
		for (var file : new File("examples/counterexamples").listFiles(new XMLFiles())) {
			int line = Integer.parseInt(test.getProperty(file.getName() + ".line"));
			int col = Integer.parseInt(test.getProperty(file.getName() + ".col"));
			String rule = test.getProperty(file.getName() + ".rule");
			try {
				negativeValidator.validate(new StreamSource(file));
				System.err.println(file.getName() + " does not fail at line " +
						line + ", column " +
						col + ", rule " + rule);
				System.exit(1);
			} catch(SAXParseException e) {
				if (e.getColumnNumber() == col &&
						e.getLineNumber() == line &&
						e.getMessage().startsWith(rule + ":"))
					System.out.println("# Negative test " + file.getName());
				else {
					System.err.println(file.getName() + " fails at line " +
							e.getLineNumber() + ", column " +
							e.getColumnNumber() + ", rule " + e.getMessage());
					System.err.println("instead of line " +
							line + ", column " +
							col + ", rule " + rule);
					System.exit(1);
				}
			}
		}
	}
}