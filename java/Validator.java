import javax.xml.transform.stream.StreamSource;
import javax.xml.validation.SchemaFactory;
import javax.xml.XMLConstants;
import java.io.File;
import java.io.FilenameFilter;
import java.io.IOException;
import org.xml.sax.SAXException;

class XMLFiles implements FilenameFilter {
	public boolean accept(File dir, String name) {
		return name.endsWith(".xml");
	}
}

public class Validator {
	public static void main(String[] args) throws IOException, SAXException {
		var schemaFactory = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
		var validator = schemaFactory.newSchema(new StreamSource(new File("schemas/edmx.xsd"))).newValidator();
		for (var file : new File("examples").listFiles(new XMLFiles())) {
			System.out.println(file.getName());
			validator.validate(new StreamSource(file));
		}
	}
}