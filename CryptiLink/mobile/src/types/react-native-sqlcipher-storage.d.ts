declare module 'react-native-sqlcipher-storage' {
  export interface ResultSet {
    insertId: number;
    rowsAffected: number;
    rows: {
      length: number;
      item(index: number): Record<string, unknown>;
    };
  }
  export interface Transaction {
    close(): Promise<void>;
    executeSql(
      sqlStatement: string,
      arguments?: unknown[],
      callback?: (transaction: Transaction, resultSet: ResultSet) => void,
      errorCallback?: (transaction: Transaction, error: Error) => boolean | void
    ): void;
  }
  export interface SQLiteDatabase {
    transaction(
      scope: (tx: Transaction) => void,
      errorCallback?: (error: Error) => void,
      successCallback?: () => void
    ): Promise<void>;
    close(): Promise<void>;
    executeSql(
      statement: string,
      params?: unknown[]
    ): Promise<[ResultSet]>;
  }
  export function openDatabase(params: {
    name: string;
    key: string;
    location: string;
  }): SQLiteDatabase;
}