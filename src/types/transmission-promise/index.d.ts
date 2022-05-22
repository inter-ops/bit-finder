declare module "transmission-promise" {
  export default class Tranmission {
    constructor(params: {
      host: string;
      port: number;
      username: string;
      password: string;
      ssl?: boolean;
      url: string;
    });

    add(magnet: string): Promise<any>;
  }
}
