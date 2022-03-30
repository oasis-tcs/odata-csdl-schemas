<xsl:transform version="1.0"
	xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
	xmlns:edm="http://docs.oasis-open.org/odata/ns/edm">
	<xsl:strip-space elements="*" />
	<xsl:template match="*">
		<xsl:copy>
			<xsl:copy-of
				select="@Path[parent::edm:NavigationPropertyBinding]|
				@*[not(
				name()='Binary' or
				name()='Bool' or
				name()='Date' or
				name()='DateTimeOffset' or
				name()='Decimal' or
				name()='Duration' or
				name()='EnumMember' or
				name()='Float' or
				name()='Guid' or
				name()='Int' or
				name()='String' or
				name()='TimeOfDay' or
				name()='AnnotationPath' or
				name()='ModelElementPath' or
				name()='NavigationPropertyPath' or
				name()='Path' or
				name()='PropertyPath' or
				name()='UrlRef')]" />
			<xsl:apply-templates
				select="@Binary|@Bool|@Date|@DateTimeOffset|@Decimal|@Duration|@EnumMember|@Float|@Guid|@Int|@String|@TimeOfDay
					|@AnnotationPath|@ModelElementPath|@NavigationPropertyPath|@Path|@PropertyPath|@UrlRef
					|node()" />
		</xsl:copy>
	</xsl:template>
	<xsl:template match="@*">
		<xsl:element name="edm:{name()}"
			namespace="http://docs.oasis-open.org/odata/ns/edm">
			<xsl:value-of select="." />
		</xsl:element>
	</xsl:template>
	<xsl:template match="@UrlRef">
		<edm:UrlRef>
			<edm:String>
				<xsl:value-of select="." />
			</edm:String>
		</edm:UrlRef>
	</xsl:template>
	<xsl:template match="edm:NavigationPropertyBinding/@Path" />
</xsl:transform>
