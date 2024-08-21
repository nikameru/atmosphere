export function Success(data: Array<any>): string {
    return 'SUCCESS\n' + data.map(String).join(' ');
}

export function Fail(data: Array<any>): string {
    return 'FAILED\n' + data.map(String).join(' ');
}
