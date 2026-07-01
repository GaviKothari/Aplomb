export interface TemplateField {
  fieldKey:    string;
  label:       string;
  patterns:    RegExp[];
  // Optional: after regex match, post-process the captured group
  transform?:  (raw: string) => string;
  // Optional: extra confidence added when this specific field is found via this template
  boost?:      number;
  // false = missing field is fine; true = log warning when missing
  important?:  boolean;
}

export interface DocumentTemplate {
  documentType:  string;
  label:         string;
  fields:        TemplateField[];
}
