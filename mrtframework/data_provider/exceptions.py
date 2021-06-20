from typing import Optional

class PublicationNotFoundError(Exception):

    def __init__(self, pid: Optional[str] = None):
        self.pid: Optional[str] = pid

    def __str__(self):
        return ('publication %s not found' % self.pid) if self.pid else 'publication not found'
