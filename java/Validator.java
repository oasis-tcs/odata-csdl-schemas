import javax.xml.transform.stream.StreamSource;
import javax.xml.validation.SchemaFactory;
import java.io.File;
import java.io.IOException;
import org.xml.sax.SAXException;

public class Validator {
	public static void main(String[] args) throws IOException, SAXException {
		var schemaFactory = SchemaFactory.newInstance("http://www.w3.org/XML/XMLSchema/v1.1");
		var validator = schemaFactory.newSchema(new StreamSource(new File("schemas/edmx.xsd"))).newValidator();
		validator.validate(new StreamSource(new File("examples/miscellaneous.xml")));
	}
}