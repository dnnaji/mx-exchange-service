import { NativeAuthServer } from '@multiversx/sdk-native-auth-server';
import {
    Injectable,
    CanActivate,
    ExecutionContext,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ApiConfigService } from 'src/helpers/api.config.service';

@Injectable()
export class NativeAuthGuard implements CanActivate {
    private readonly logger: Logger;
    private readonly authServer: NativeAuthServer;
    private impersonateAddress: string;

    constructor(apiConfigService: ApiConfigService) {
        this.logger = new Logger(NativeAuthGuard.name);
        this.authServer = new NativeAuthServer({
            apiUrl: apiConfigService.getApiUrl(),
        });
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        let request = context.switchToHttp().getRequest();
        if (!request) {
            const ctx = GqlExecutionContext.create(context);
            request = ctx.getContext().req;
        }

        if (request.headers !== undefined) {
            this.impersonateAddress = request.headers['impersonate-address'];
        }

        const authorization: string = request.headers['authorization'];
        if (!authorization) {
            throw new UnauthorizedException();
        }
        const jwt = authorization.replace('Bearer ', '');

        try {
            const userInfo = await this.authServer.validate(jwt);

            request.res.set('X-Native-Auth-Issued', userInfo.issued);
            request.res.set('X-Native-Auth-Expires', userInfo.expires);
            request.res.set('X-Native-Auth-Address', userInfo.address);
            request.res.set(
                'X-Native-Auth-Timestamp',
                Math.round(new Date().getTime() / 1000),
            );

            if (this.impersonateAddress) {
                const admins = process.env.SECURITY_ADMINS.split(',');
                if (admins.find((admin) => admin === userInfo.address)) {
                    request.res.set(
                        'X-Native-Auth-Address',
                        this.impersonateAddress,
                    );
                }
            }

            request.auth = userInfo;

            return true;
        } catch (error: any) {
            this.logger.error(error);
            return false;
        }
    }
}
