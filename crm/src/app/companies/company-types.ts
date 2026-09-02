export type CompanyFormValues = {
  name: string;
  website: string;
  phone: string;
  description: string;
};

export type CompanyField = keyof CompanyFormValues;

export type CompanyFormState = {
  errors?: Partial<Record<CompanyField, string[]>>;
  message?: string;
  values?: CompanyFormValues;
};

export type DeleteCompanyState = {
  message?: string;
};
