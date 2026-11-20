export function isArcadeOwner(request, env) {
  const id = request.headers.get('oai-authenticated-user-id');
  const email = request.headers.get('oai-authenticated-user-email');
  const owners = (env.REQUEST_ADMIN_EMAILS || '').split(',').map(value => value.trim().toLowerCase());
  return Boolean(id && email && owners.includes(email.toLowerCase()));
}
