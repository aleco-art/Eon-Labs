export type ContactFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  companyId: string;
};

export type ContactField = keyof ContactFormValues;

export type ContactFormState = {
  errors?: Partial<Record<ContactField, string[]>>;
  message?: string;
  values?: ContactFormValues;
};

export type DeleteContactState = {
  message?: string;
};

export type CompanyOption = {
  id: string;
  name: string;
};
