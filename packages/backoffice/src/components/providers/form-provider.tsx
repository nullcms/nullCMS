import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useForm, type ReactFormExtendedApi } from '@tanstack/react-form';

interface FormContextType {
  formInstance: ReactFormExtendedApi<Record<string, unknown>, any, any, any, any, any, any, any, any, any>;
  isSubmitting: boolean;
  isDirty: boolean;
  save: () => Promise<void>;
}

const FormContext = createContext<FormContextType | undefined>(undefined);

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context;
};

interface FormProviderProps {
  initialValues: Record<string, unknown>;
  onSave: (values: Record<string, unknown>) => Promise<void>;
  children: React.ReactNode;
}

export const FormProvider: React.FC<FormProviderProps> = ({ 
  initialValues, 
  onSave, 
  children 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Use TanStack form
  const form = useForm({
    defaultValues: initialValues,
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      try {
        await onSave(value);
        toast.success('Document saved successfully');
      } catch (error) {
        console.error('Error saving document:', error);
        toast.error('Failed to save document');
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  // Update form values when initialValues change
  useEffect(() => {
    form.reset({ values: initialValues });
  }, [JSON.stringify(initialValues)]);

  const save = async () => {
    try {
      await form.handleSubmit();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };
  
  return (
    <FormContext.Provider value={{ 
      formInstance: form,
      isSubmitting,
      isDirty: form.state.isDirty,
      save
    }}>
      <form>
        {children}
      </form>
    </FormContext.Provider>
  );
};