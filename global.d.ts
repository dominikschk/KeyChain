/** Google Identity Services (GSI) – „Mit Google anmelden“. */
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            el: HTMLElement,
            options: { theme?: 'outline' | 'filled_blue' | 'filled_black'; size?: 'large' | 'medium' | 'small'; type?: 'standard' | 'icon'; text?: 'signin_with' | 'signup_with' | 'continue_with'; width?: number }
          ) => void;
        };
      };
    };
  }
}
export {};
