import * as XLSX from "xlsx";

export const downloadTemplate = (type) => {
  const headers = type === "single"
    ? ["post_type", "title", "paragraph", "cta_text"]
    : ["post_type", "slide1_title", "slide2_title", "slide2_paragraph", "slide3_title", "slide3_paragraph", "slide4_title", "slide4_paragraph", "slide5_title", "slide5_paragraph", "slide6_title", "cta_text"];
  const sample = type === "single"
    ? [["single", "Your Post Title Here", "Write your paragraph text.", "Learn More"]]
    : [["carousel", "Intro Slide Title", "Slide 2 Title", "Slide 2 paragraph text here.", "Slide 3 Title", "Slide 3 paragraph text here.", "Slide 4 Title", "Slide 4 paragraph text.", "Slide 5 Title", "Slide 5 paragraph text.", "Final Slide Title", "Learn More"]];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...sample]), "Posts");
  XLSX.writeFile(wb, `template_${type}.xlsx`);
};
