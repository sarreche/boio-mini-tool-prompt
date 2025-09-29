export const validateEmail = async (email: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/auth/validate-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error('Error validating email');
    }

    const data = await response.json();
    return data.isValid;
  } catch (error) {
    console.error('Error validating email:', error);
    return false;
  }
};

export const validatePin = async (email: string, pin: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/auth/validate-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, pin }),
    });

    if (!response.ok) {
      throw new Error('Error validating PIN');
    }

    const data = await response.json();
    return data.isValid;
  } catch (error) {
    console.error('Error validating PIN:', error);
    return false;
  }
};