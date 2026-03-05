declare module 'react-native-webview' {
  import { ComponentType } from 'react';
  import { ViewProps } from 'react-native';

  export interface WebViewSource {
    uri?: string;
    html?: string;
    baseUrl?: string;
    headers?: Record<string, string>;
    body?: string;
  }

  export interface WebViewProps extends ViewProps {
    source: WebViewSource;
    onLoadStart?: () => void;
    onLoadEnd?: () => void;
    onError?: () => void;
    startInLoadingState?: boolean;
    allowsFullscreenVideo?: boolean;
  }

  export const WebView: ComponentType<WebViewProps>;
  export default WebView;
}
