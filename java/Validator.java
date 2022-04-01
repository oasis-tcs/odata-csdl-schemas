import javax.xml.transform.stream.StreamSource;
import javax.xml.validation.SchemaFactory;
import javax.xml.XMLConstants;
import java.io.File;
import java.io.FileInputStream;
import java.io.FilenameFilter;
import java.io.IOException;
import java.util.Properties;
import org.xml.sax.SAXException;
import org.xml.sax.SAXParseException;

class XMLFiles implements FilenameFilter {
	public boolean accept(File dir, String name) {
		return name.endsWith(".xml");
	}
}

public class Validator {
	public static void main(String[] args) throws IOException, SAXException {
		var schemaFactory = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
		var validator = schemaFactory.newSchema(new File("schemas/edmx.xsd")).newValidator();
		for (var file : new File("examples").listFiles(new XMLFiles())) {
			System.out.println(file.getName());
			validator.validate(new StreamSource(file));
		}
		var test = new Properties();
		test.load(new FileInputStream("examples/counterexamples/test.properties"));
		for (var file : new File("examples/counterexamples").listFiles(new XMLFiles())) {
			int line = Integer.parseInt(test.getProperty(file.getName() + ".line"));
			int col = Integer.parseInt(test.getProperty(file.getName() + ".col"));
			String rule = test.getProperty(file.getName() + ".rule");
			try {
				validator.validate(new StreamSource(file));
				System.err.println(file.getName() + " does not fail at line " +
						line + ", column " +
						col + ", rule " + rule);
				System.exit(1);
			} catch(SAXParseException e) {
				if (e.getColumnNumber() == col &&
						e.getLineNumber() == line &&
						e.getMessage().startsWith(rule + ":"))
					System.out.println("Negative test " + file.getName());
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