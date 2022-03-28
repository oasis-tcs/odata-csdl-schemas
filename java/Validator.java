import javax.xml.transform.stream.StreamSource;
import javax.xml.validation.SchemaFactory;
import javax.xml.XMLConstants;
import java.io.File;
import java.io.IOException;
import org.xml.sax.SAXException;

public class Validator {
	public static void main(String[] args) throws IOException, SAXException {
		var schemaFactory = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
		StreamSource[] schemaFiles = new StreamSource[2];
		schemaFiles[0] = new StreamSource(new File("schemas/edmx.xsd"));
		schemaFiles[1] = new StreamSource(new File("schemas/edm.xsd"));
		var validator = schemaFactory.newSchema(schemaFiles).newValidator();
		validator.validate(new StreamSource(new File("examples/miscellaneous.xml")));
	}
}