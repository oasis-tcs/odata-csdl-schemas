import javax.xml.transform.stream.StreamSource;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.dom.DOMResult;
import javax.xml.validation.SchemaFactory;
import javax.xml.XMLConstants;
import java.io.File;
import java.io.FilenameFilter;
import java.io.IOException;
import org.xml.sax.SAXException;
import javax.xml.transform.TransformerException;

class XMLFiles implements FilenameFilter {
	public boolean accept(File dir, String name) {
		return name.endsWith(".xml");
	}
}

public class Validator {
	public static void main(String[] args) throws IOException, SAXException, TransformerException {
		var schemaFactory = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
		var validator = schemaFactory.newSchema(new File("schemas/edmx.xsd")).newValidator();
		var transformerFactory = TransformerFactory.newInstance();
		var transformer = transformerFactory.newTransformer(new StreamSource(new File("java/Validator.xsl")));
		for (var file : new File("examples").listFiles(new XMLFiles())) {
			System.out.println(file.getName());
			var preprocessed = new DOMResult();
			transformer.transform(new StreamSource(file), preprocessed);
			validator.validate(new DOMSource(preprocessed.getNode()));
		}
	}
}