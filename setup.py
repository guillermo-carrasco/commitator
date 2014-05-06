#!/usr/bin/env python

from setuptools import setup
from pip.req import parse_requirements

install_requires = parse_requirements('requirements.txt')

setup(name='Commitator',
      version='1.0',
      description="Commitator is a simple WebApp to see nice stats from your GitHub orgnization",
      author='Guillermo Carrasco, Adria Casas',
      author_email='guille.ch.88@gmail.com',
      packages=['commitator'],
      install_requires = [str(r.req) for r in install_requires]
)
