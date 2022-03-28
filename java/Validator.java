import javax.xml.transform.stream.StreamSource;
import javax.xml.validation.SchemaFactory;
import javax.xml.XMLConstants;
import java.io.File;
import java.io.IOException;
import org.xml.sax.SAXException;

public class Validator {
	public static void main(String[] args) throws IOException, SAXException {
		var schemaFactory = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
		var validator = schemaFactory.newSchema(new StreamSource(new File("schemas/edmx.xsd"))).newValidator();
		validator.validate(new StreamSource(new File("examples/csdl-16.1.xml")));
		validator.validate(new StreamSource(new File("examples/csdl-16.2.xml")));
		validator.validate(new StreamSource(new File("examples/miscellaneous.xml")));
		validator.validate(new StreamSource(new File("examples/miscellaneous2.xml")));
	}
}