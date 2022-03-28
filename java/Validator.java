import javax.xml.transform.stream.StreamSource;
import javax.xml.validation.SchemaFactory;
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
		var schemaFactory = SchemaFactory.newInstance("http://www.w3.org/XML/XMLSchema/v1.1");
		var validator = schemaFactory.newSchema(new File("schemas/edmx.xsd")).newValidator();
		for (var file : new File("examples").listFiles(new XMLFiles())) {
			System.out.println(file.getName());
			validator.validate(new StreamSource(file));
		}
	}
}